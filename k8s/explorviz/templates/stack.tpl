{{- $files := .Files }}
{{- $suffix := printf "%s.svc.%s" .Release.Namespace .Values.clusterDomain }}
{{- $authEnabled := .Values.profiles.auth | toString | quote }}
{{- $keycloakURL := trimSuffix "/" .Values.keycloak.publicURL }}
{{- range $path, $_ := $files.Glob "generated/*/*.yaml" }}
{{- $profile := base (dir $path) }}
{{- if and (ne $profile "always") (not (hasKey $.Values.profiles $profile)) }}
{{- fail (printf "values.yaml is missing profiles.%s" $profile) }}
{{- end }}
{{- if or (eq $profile "always") (index $.Values.profiles $profile) }}
---
{{ $files.Get $path | replace "__SERVICE_DNS_SUFFIX__" $suffix | replace "__KEYCLOAK_AUTH_ENABLED__" $authEnabled | replace "__KEYCLOAK_PUBLIC_URL__" $keycloakURL -}}
{{- end }}
{{- end }}
