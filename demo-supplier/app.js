const express = require("express");
const { readFile } = require("node:fs/promises");
const cors = require("cors");
const compression = require("compression");
const {
  removeRandomTraces,
  recursivelyRandomizeAllHashCodesOfPackages,
  copyPackageAndTraces,
  createRandomHex,
  calculateTenSecondLaterNeighbourTimestamp,
} = require("./utils.js");
const { time } = require("node:console");

const spanApp = createExpressApplication(8083);
const userApp = createExpressApplication(8084);
const metricApp = createExpressApplication(8085); // open port for mocked metric-service

const spanRootUrl = "/v2/landscapes";
const userRootUrl = "/user/:uid/token";
const metricRootUrl = "/metrics"; // add required suffix to get request

(async () => {
  const user = JSON.parse(await readFile("./user.json"));
  userApp.get(`${userRootUrl}`, (req, res) => res.json(user));
})();

createLandscapeSample({
  filePrefix: "plantuml",
  token: "7cd8a9a7-b840-4735-9ef0-2dbbfa01c039",
});

createLandscapeSample({
  filePrefix: "petclinic-distributed",
  token: "26844195-7235-4254-a17b-0f7fb49adb0a",
});

createLandscapeSample({
  filePrefix: "petclinic",
  token: "19844195-7235-4254-a17b-0f7fb49adb0a",
  traceModifier: removeRandomTraces,
  timestampModifier: (latestTimestandEpochMilli) => {
    const nextTimestampMilli = calculateTenSecondLaterNeighbourTimestamp(
      parseInt(latestTimestandEpochMilli),
    );
    const randomSpanCount = parseInt(Math.random() * (150 - 50) + 50);

    return {
      epochMilli: nextTimestampMilli,
      spanCount: randomSpanCount,
    };
  },
});

createLandscapeSample({
  filePrefix: "big-landscape",
  token: "a87167e5-8ec1-4b98-830a-dba87d213bb0",
});

createLandscapeSample({
  filePrefix: "vissoft23",
  token: "12444195-6144-4254-a17b-asdgfewefg",
});

createLandscapeSample({
  filePrefix: "petclinic-angular",
  token: "e0296ba3-983e-4b05-b559-ba48c778ef3e",
});

createLandscapeSample({
  filePrefix: "mongo-express",
  token: "0ad5c1cd-e2de-4404-9cc8-6da758d82010",
});


// BEGIN BIG SL Sample
createLandscapeSample({
  filePrefix: "petclinic",
  token: "1d8c9223-b790-4873-9b5d-fdf68cdc082f",
  initializer: (structure, traces) => {
    const originalTraces = structuredClone(traces);

    const node = structure.nodes[0];
    const app = node.applications[0];
    const package = app.packages[0];

    app.name = "large-demo-landscape";

    app.packages.unshift({
      name: "changing",
      subPackages: [],
      classes: Array.from({ length: 12 }, () => ({
        name: "C" + createRandomHex(6),
        methods: [],
      })),
    });

    for (let i = 0; i < 15; i++) {
      const { packageCopy, newTraces } = copyPackageAndTraces(
        package,
        originalTraces,
      );

      app.packages.push({
        name: `petclinic${i}`,
        subPackages: [packageCopy],
        classes: [],
      });

      traces.push(...newTraces);
    }
  },
  structureModifier: (structure) => {
    const changingPackage = structure.nodes[0].applications[0].packages[0];
    changingPackage.classes.forEach((c) => (c.name = "C" + createRandomHex(6)));
    return structure;
  },
});
// END BIG SL Sample

{
  // BEGIN Increasing SL Sample
  let previousStructure = null;

  createLandscapeSample({
    filePrefix: "petclinic",
    token: "12444195-6144-4254-a17b-0f7fb49adb0a",
    structureModifier: (structureData) => {
      if (!previousStructure) {
        previousStructure = structuredClone(structureData);
        return previousStructure;
      }

      const node = structureData.nodes[0];
      const app = node.applications[0];
      const package = app.packages[0];

      const newStructure = addTopLevelPackageToFirstApplication(
        package,
        previousStructure,
      );
      previousStructure = newStructure;

      return previousStructure;
    },
    timestampModifier: (latestTimestandEpochMilli) => {
      const nextTimestampMilli = calculateTenSecondLaterNeighbourTimestamp(
        parseInt(latestTimestandEpochMilli),
      );
      const randomSpanCount = parseInt(Math.random() * (150 - 50) + 50);

      return {
        epochMilli: nextTimestampMilli,
        spanCount: randomSpanCount,
      };
    },
  });

  function addTopLevelPackageToFirstApplication(
    topLevelPackage,
    structureRecord,
  ) {
    const deepCopyPackage = structuredClone(topLevelPackage);
    recursivelyRandomizeAllHashCodesOfPackages(deepCopyPackage);

    const node = structureRecord.nodes[0];
    const app = node.applications[0];

    const newTopLevelPackage = {
      name: `copy${app.packages.length - 1}`,
      subPackages: [deepCopyPackage],
      classes: [],
    };

    app.packages.push(newTopLevelPackage);

    return structureRecord;
  }
} // END Increasing SL Sample

/**
 * Creates and configures a express application instance.
 * @param {number} port
 * @returns a express application instance
 */
function createExpressApplication(port) {
  const app = express();

  // Disable caching to prevent HTTP 304
  app.disable("etag");

  app.use(compression());
  app.use(cors());
  app.listen(port, () => {});

  return app;
}

/**
 * @typedef {(data: any) => any} DataModifier
 */

/**
 * Create a sample landscape for the ExplorViz demo.
 * Loads the data and sets up express routes.
 * @param {{
 *  filePrefix: string;
 *  token: string;
 *  traceModifier?: DataModifier,
 *  structureModifier?: DataModifier,
 *  timestampModifier?: DataModifier,
 *  initializer?: (structure, trace) => void
 * }} options
 */
async function createLandscapeSample({
  filePrefix,
  token,
  traceModifier,
  structureModifier,
  timestampModifier,
  initializer,
}) {
  const structureData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-structure.json`),
  );
  const dynamicData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-dynamic.json`),
  );
  const timestampData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-timestamp.json`),
  );

  structureData.landscapeToken = token;
  initializer?.(structureData, dynamicData);

  spanApp.get(`${spanRootUrl}/${token}/structure`, (req, res) =>
    res.json(
      structureModifier ? structureModifier(structureData) : structureData,
    ),
  );

  spanApp.get(`${spanRootUrl}/${token}/dynamic`, (req, res) =>
    res.json(traceModifier ? traceModifier(dynamicData) : dynamicData),
  );

  spanApp.get(`${spanRootUrl}/${token}/timestamps`, (req, res) => {
    const potentialLatestTimestamp = req.query.newest;
    if (potentialLatestTimestamp && timestampModifier) {
      const newTimestamp = timestampModifier(potentialLatestTimestamp);

      if (newTimestamp) {
        timestampData.push(newTimestamp);
        res.json([newTimestamp]);
      } else {
        res.json([]);
      }
    } else {
      res.json(timestampData);
    }
  });
}

// for every landscape with metrics an an array with the token as identifier
const landscapeMetrics = {
  "0ad5c1cd-e2de-4404-9cc8-6da758d82010": {
    filePrefix: "mongo-express",
    timestamp: 1708675770000,
  },
  // for other landscape with metrics
};

/**
 * Respond accordingly to the metric request by the frontend. As of now, every metric within the JSON is returned,
 * which means you cannot get metrics from different timestamps other than the one initialized in landscapeMetrics
 * 
 * The route is no different to the existing ones, it checks if the landscape token or timestamp exist and are the ones expected
 * then the JSON are loaded from the demo data and are responded to the request
 */
metricApp.get(metricRootUrl, async (req, res) => {
  const { landscapeToken, timeStamp } = req.query;
  const landscapeConfig = landscapeMetrics[landscapeToken];

  if (!landscapeConfig || landscapeConfig.timestamp.toString() !== timeStamp) {
    return res.status(404).send("Landscape not found or timestamp mismatch");
  }

  try {
    const filePath = `demo-data/${landscapeConfig.filePrefix}-metric.json`;
    const metricData = JSON.parse(await readFile(filePath));
    res.json(metricData);
  } catch (error) {
    console.error("Error reading metric data:", error);
    res.status(500).send("Error loading metric data");
  }
});
