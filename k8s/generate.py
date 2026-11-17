#!/usr/bin/env python3
"""Regenerate the ExplorViz Helm manifests from the Docker Compose stack."""

import hashlib
import json
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile

import yaml


K8S = Path(__file__).resolve().parent
DOCKER = K8S.parent / "docker"
CHART = K8S / "explorviz"
AUTH_SECRET = "explorviz-keycloak"
AUTH_KEYS = {
    "KC_DB_PASSWORD": "database-password",
    "POSTGRES_PASSWORD": "database-password",
    "KC_BOOTSTRAP_ADMIN_PASSWORD": "admin-password",
}


class ManifestDumper(yaml.SafeDumper):
    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def represent_string(dumper, value):
    style = "|" if "\n" in value else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", value, style=style)


ManifestDumper.add_representer(str, represent_string)


def compose_model():
    compose = ["docker", "compose", "--profile", "*"]
    model = json.loads(subprocess.check_output(
        [*compose, "config", "--no-env-resolution", "--format", "json"],
        cwd=DOCKER,
    ))
    # Let Compose parse the shared dotenv file without loading local overrides
    # or resolving the chatbot's API-key file.
    env_reader = {"services": {"env": {
        "image": "scratch", "env_file": [str(DOCKER / ".env")],
    }}}
    resolved = json.loads(subprocess.check_output(
        ["docker", "compose", "-f", "-", "config", "--format", "json"],
        cwd=DOCKER, input=json.dumps(env_reader).encode(),
    ))
    shared_env = resolved["services"]["env"]["environment"]
    for service in model["services"].values():
        files = service.pop("env_file", [])
        if any(Path(entry["path"]) == DOCKER / ".env" for entry in files):
            service["environment"] = {**shared_env, **service.get("environment", {})}
    return model


def prepare_conversion(model):
    services = model["services"]
    kafka = services["kafka"]
    kafka_port = int(services["init-kafka"]["environment"]["KAFKA_INT_PORT"])
    internal_ports = {
        "kafka": [kafka_port],
        "kafka-lag-exporter": [8000],
        "postgres-keycloak": [5432],
    }
    for name, service in services.items():
        ports = service.setdefault("ports", [])
        ports.extend({"target": port, "protocol": "tcp"}
                     for port in internal_ports.get(name, []))
        for port in ports:
            # Use container ports for in-cluster Services. Host mappings belong
            # to port-forwarding or an external Service.
            port["published"] = str(port["target"])
            port.pop("host_ip", None)

    kafka_env = kafka["environment"]
    kafka_env["KAFKA_LISTENERS"] = kafka_env["KAFKA_LISTENERS"].replace(
        "://kafka:", "://0.0.0.0:"
    )
    kafka_env["KAFKA_CONTROLLER_QUORUM_VOTERS"] = kafka_env[
        "KAFKA_CONTROLLER_QUORUM_VOTERS"
    ].replace("@kafka:", "@localhost:")

    user_env = services["user-service"]["environment"]
    mongo_port = services["mongo-user"]["ports"][0]["target"]
    user_env["QUARKUS_MONGODB_CONNECTION_STRING"] = f"mongodb://mongo-user:{mongo_port}"
    user_env["MONGO_USER_HOSTNAME"] = "mongo-user"
    user_env.pop("LOCALHOST_ALIAS", None)

    frontend_env = services["frontend"]["environment"]
    for variable, name in {
        "CODE_ANALYZER_URL": "code-analyzer",
        "COLLAB_SERV_URL": "collaboration-service",
        "COPILOT_SERV_URL": "chatbot-service",
        "KEYCLOAK_URL": "keycloak",
        "LANDSCAPE_SERV_URL": "landscape-service",
        "LOG_SERV_URL": "log-service",
        "METRICS_SERV_URL": "metrics-service",
        "TRACE_SERV_URL": "trace-service",
        "USER_SERV_URL": "user-service",
        "VSCODE_SERV_URL": "vs-code-backend",
    }.items():
        port = services[name]["ports"][0]["target"]
        frontend_env[variable] = f"http://{name}.__SERVICE_DNS_SUFFIX__:{port}"
    user_env["QUARKUS_OIDC_TOKEN_ISSUER"] = (
        "__KEYCLOAK_PUBLIC_URL__/realms/" + user_env["KEYCLOAK_REALM"]
    )
    collaboration_env = services["collaboration-service"]["environment"]
    collaboration_env["KEYCLOAK_ISSUER"] = (
        "__KEYCLOAK_PUBLIC_URL__/realms/" + collaboration_env["KEYCLOAK_REALM"]
    )
    for service in services.values():
        # PUBLIC_URL is the browser-facing origin, which is set by the chart.
        if "PUBLIC_URL" in service.get("environment", {}):
            service["environment"]["PUBLIC_URL"] = "__KEYCLOAK_PUBLIC_URL__"
    keycloak_env = services["keycloak"]["environment"]
    keycloak_env.pop("KC_HOSTNAME_SCHEME", None)
    keycloak_env["KC_HOSTNAME"] = "__KEYCLOAK_PUBLIC_URL__"
    services["keycloak"]["environment"]["KC_DB_URL"] = (
        "jdbc:postgresql://postgres-keycloak:5432/"
        + services["postgres-keycloak"]["environment"]["POSTGRES_DB"]
    )

    converted = {"services": {}, "volumes": model["volumes"]}
    for name, service in services.items():
        converted["services"][name] = {
            key: service[key] for key in ("image", "ports", "deploy") if key in service
        }
        converted["services"][name]["volumes"] = [
            volume for volume in service.get("volumes", [])
            if volume["type"] == "volume" and name != "init-kafka"
        ]
    return converted, kafka_port


def bind_configs(name, service, pod, container, services):
    for index, volume in enumerate(service.get("volumes", [])):
        if volume["type"] != "bind":
            continue
        source = Path(volume["source"])
        paths = [source] if source.is_file() else sorted(
            path for path in source.rglob("*") if path.is_file()
        )
        paths = [path for path in paths if not path.name.startswith(".")]
        if not paths:
            raise ValueError(f"No configuration files found at {source}")

        config_name = f"{name}-config-{index}"
        data = {}
        items = []
        for number, path in enumerate(paths):
            key = f"file-{number}"
            relative_path = path.name if source.is_file() else path.relative_to(source).as_posix()
            content = path.read_text()
            if name == "prometheus" and path.name == "prometheus.yml":
                config = yaml.safe_load(content)
                for job in config["scrape_configs"]:
                    if job["job_name"] == "landscape-service":
                        for target in job.get("dns_sd_configs", []):
                            target["port"] = services["landscape-service"]["ports"][0]["target"]
                    if "static_configs" in job:
                        job["static_configs"] = [
                            target for target in job["static_configs"]
                            if not any(address.startswith("host.docker.internal:")
                                       for address in target["targets"])
                        ]
                config["scrape_configs"] = [
                    job for job in config["scrape_configs"]
                    if job.get("static_configs") or job.get("dns_sd_configs")
                ]
                content = yaml.safe_dump(config, sort_keys=False)
            data[key] = content
            items.append({"key": key, "path": relative_path})

        pod.setdefault("volumes", []).append({
            "name": config_name,
            "configMap": {
                "name": config_name,
                "defaultMode": 0o555 if source.suffix == ".sh" else 0o444,
                "items": items,
            },
        })
        mount = {"name": config_name, "mountPath": volume["target"], "readOnly": True}
        if source.is_file():
            mount["subPath"] = source.name
        container.setdefault("volumeMounts", []).append(mount)
        yield {"apiVersion": "v1", "kind": "ConfigMap",
               "metadata": {"name": config_name}, "data": data}


def environment(name, service):
    for key, value in sorted(service.get("environment", {}).items()):
        if key in {"KEYCLOAK_ADMIN_PASS", "KEYCLOAK_DB_PWD", "COMPOSE_PROFILES",
                   "COMPOSE_PROJECT_NAME", "LOCALHOST_ALIAS"} or value is None:
            continue
        if key in AUTH_KEYS:
            yield {"name": key, "valueFrom": {"secretKeyRef": {
                "name": AUTH_SECRET, "key": AUTH_KEYS[key],
            }}}
        elif (name, key) in {("frontend", "KEYCLOAK_AUTH_ENABLED"),
                             ("collaboration-service", "KEYCLOAK_AUTH_ENABLED"),
                             ("user-service", "QUARKUS_OIDC_ENABLED")}:
            yield {"name": key, "value": "__KEYCLOAK_AUTH_ENABLED__"}
        else:
            yield {"name": key, "value": value.replace("$(", "$$(")}


def wait_for_dependencies(service, services, kafka_port, topics):
    for dependency, options in service.get("depends_on", {}).items():
        if options["condition"] == "service_completed_successfully":
            if dependency != "init-kafka":
                raise ValueError(f"Unsupported completion dependency: {dependency}")
            broker = f"kafka:{kafka_port}"
            checks = " && ".join(
                f'printf "%s\\n" "$topics" | grep -Fxq -- {shlex.quote(topic)}'
                for topic in topics
            )
            yield {
                "name": "wait-for-kafka-topics",
                # The native Kafka image has no CLI tools.
                "image": services["init-kafka"]["image"],
                "command": ["/bin/sh", "-ec",
                            f"until topics=$(/opt/kafka/bin/kafka-topics.sh --bootstrap-server {broker} "
                            f"--list 2>/dev/null) && {checks}; do sleep 5; done"],
            }
            continue
        port = kafka_port if dependency == "kafka" else services[dependency]["ports"][0]["target"]
        yield {
            "name": f"wait-for-{dependency}",
            "image": "busybox:1.37",
            "command": ["sh", "-ec", f"until nc -z -w 2 {dependency} {port}; do sleep 2; done"],
        }


def add_healthcheck(name, container, service):
    healthcheck = service.get("healthcheck")
    if not healthcheck:
        return
    mode, *command = healthcheck["test"]
    if mode == "NONE":
        return
    if mode == "CMD-SHELL":
        command = ["/bin/sh", "-ec", *command]
    container["readinessProbe"] = {
        "exec": {"command": command},
        "periodSeconds": duration_seconds(healthcheck.get("interval", "30s")),
        "timeoutSeconds": duration_seconds(healthcheck.get("timeout", "30s")),
        "failureThreshold": healthcheck.get("retries", 3),
    }


def duration_seconds(duration):
    if duration.endswith("s") and duration[:-1].isdigit():
        return int(duration[:-1])
    raise ValueError(f"Expected a whole-second healthcheck duration: {duration}")


def adapt_workload(workload, service, services, kafka_port, topics):
    name = workload["metadata"]["name"]
    template = workload["spec"]["template"]
    pod = template["spec"]
    pod["enableServiceLinks"] = False
    if workload["spec"].get("strategy", {}).get("type") == "Recreate":
        # Stop the old pod before starting its replacement so ReadWriteOnce
        # claims are released. Unlike Recreate, this also upgrades releases
        # whose Deployments were created without volumes.
        workload["spec"]["strategy"] = {
            "type": "RollingUpdate",
            "rollingUpdate": {"maxSurge": 0, "maxUnavailable": 1},
        }
    container = pod["containers"][0]
    env = list(environment(name, service))
    if env:
        container["env"] = env
    if name == "chatbot-service":
        container["envFrom"] = [{"secretRef": {"name": "explorviz-chatbot"}}]
    if service.get("entrypoint"):
        container["command"] = service["entrypoint"]
    if service.get("command"):
        container["args"] = [arg.replace("$(", "$$(") for arg in service["command"]]
    if name == "kafka-lag-exporter":
        container["command"] = [container["args"].pop(0)]

    configs = list(bind_configs(name, service, pod, container, services))
    if configs:
        checksum = hashlib.sha256(json.dumps(configs, sort_keys=True).encode()).hexdigest()
        template["metadata"].setdefault("annotations", {})["checksum/config"] = checksum

    dependencies = list(wait_for_dependencies(service, services, kafka_port, topics))
    if dependencies:
        pod["initContainers"] = dependencies
    add_healthcheck(name, container, service)

    groups = {"kafka": 1000, "prometheus": 65534, "grafana": 472}
    if name in groups:
        pod["securityContext"] = {"fsGroup": groups[name]}
    if name == "init-kafka":
        workload.update(apiVersion="batch/v1", kind="Job")
        workload["spec"] = {"template": template, "backoffLimit": 6}
        pod["restartPolicy"] = "Never"
        container["command"] = ["/bin/sh", "-ec"]
        container["args"] = [". " + shlex.quote(service["command"][0])]
        revision = hashlib.sha256(json.dumps(template, sort_keys=True).encode()).hexdigest()[:10]
        workload["metadata"]["name"] = f"init-kafka-{revision}"
        workload["spec"]["activeDeadlineSeconds"] = 600
    return configs


def main():
    model = compose_model()
    services = model["services"]
    conversion, kafka_port = prepare_conversion(model)
    topic_script = next(
        Path(volume["source"]) for volume in services["init-kafka"]["volumes"]
        if volume["target"] == services["init-kafka"]["command"][0]
    )
    topics = []
    for line in topic_script.read_text().splitlines():
        words = shlex.split(line, comments=True)
        if "--topic" in words and "--create" in words:
            topics.append(words[words.index("--topic") + 1])
    if not topics:
        raise ValueError(f"No Kafka topics found in {topic_script}")

    with tempfile.TemporaryDirectory() as directory:
        work = Path(directory)
        (work / "explorviz.yaml").write_text(json.dumps(conversion))
        subprocess.run(
            ["kompose", "-f", "explorviz.yaml", "convert", "--chart", "--pvc-request-size", "1Gi"],
            cwd=work, check=True,
        )
        converted_chart = work / "explorviz"
        manifests = work / "generated"
        for path in sorted((converted_chart / "templates").glob("*.yaml")):
            resource = yaml.safe_load(path.read_text())
            name = resource["metadata"]["name"]
            service = services.get(name, {})
            profiles = service.get("profiles", [])
            if resource["kind"] == "PersistentVolumeClaim":
                profiles = next(
                    definition.get("profiles", [])
                    for definition in services.values()
                    if any(volume.get("source") == name
                           for volume in definition.get("volumes", []))
                )
            resources = [resource]
            if resource["kind"] == "Deployment":
                resources.extend(adapt_workload(resource, service, services, kafka_port, topics))
            # init-env is a Compose alias for the initializer, which requires Kafka.
            group = next(iter(profiles), "always")
            folder = manifests / group
            folder.mkdir(parents=True, exist_ok=True)
            filename = "init-kafka-job.yaml" if resource["kind"] == "Job" else path.name
            (folder / filename).write_text(yaml.dump_all(
                resources, Dumper=ManifestDumper, sort_keys=False, width=1000, allow_unicode=True,
            ))

        values = yaml.safe_load((CHART / "values.yaml").read_text())
        missing = sorted({path.name for path in manifests.iterdir()} - {"always"}
                         - set(values.get("profiles", {})))
        if missing:
            raise ValueError("Add these profiles to explorviz/values.yaml: " + ", ".join(missing))
        shutil.copytree(CHART, work / "chart", ignore=shutil.ignore_patterns("generated"))
        shutil.copytree(manifests, work / "chart" / "generated")
        subprocess.run(["helm", "lint", str(work / "chart")], check=True)
        target = CHART / "generated"
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(manifests, target)


if __name__ == "__main__":
    main()
