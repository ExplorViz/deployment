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

const spanRootUrl = "/v2/landscapes";
const userRootUrl = "/user/:uid/token";

(async () => {
  const user = JSON.parse(await readFile("./user.json"));
  userApp.get(`${userRootUrl}`, (req, res) => res.json(user));
})();

createLandscapeSample({
  filePrefix: "tracegen-small-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0g",
});
createLandscapeSample({
  filePrefix: "tracegen-small-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0f",
});
createLandscapeSample({
  filePrefix: "tracegen-middle-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0e",
});
createLandscapeSample({
  filePrefix: "tracegen-middle-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0d",
});
createLandscapeSample({
  filePrefix: "tracegen-large-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0c",
});
createLandscapeSample({
  filePrefix: "tracegen-large-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adb0b",
});
createLandscapeSample({
  filePrefix: "tracegen-extralarge-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbaa",
});
createLandscapeSample({
  filePrefix: "tracegen-extralarge-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbab",
});
createLandscapeSample({
  filePrefix: "tracegen-xxl-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbac",
});
createLandscapeSample({
  filePrefix: "tracegen-xxl-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbad",
});
createLandscapeSample({
  filePrefix: "tracegen-xxxl-world-low-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbae",
});
createLandscapeSample({
  filePrefix: "tracegen-xxxl-world-high-communication",
  token: "26844295-7235-4254-a17b-0f7fb49adbaf",
});

createLandscapeSample({
  filePrefix: "plantuml",
  token: "7cd8a9a7-b840-4735-9ef0-2dbbfa01c039",
});

createLandscapeSample({
  filePrefix: "petclinic-scattered",
  token: "gcd8ada7-b840-4735-9ef0-2dbbfa01c039",
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
    let nextTimestampMilli = calculateTenSecondLaterNeighbourTimestamp(
      parseInt(latestTimestandEpochMilli)
    );
    let randomSpanCount = parseInt(Math.random() * (150 - 50) + 50);

    if (Math.random() > 0.75) {
      nextTimestampMilli += 10000;
    }

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
        originalTraces
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
    filePrefix: "petclinic-distributed",
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
        previousStructure
      );
      previousStructure = newStructure;

      return previousStructure;
    },
    timestampModifier: (latestTimestandEpochMilli) => {
      const nextTimestampMilli = calculateTenSecondLaterNeighbourTimestamp(
        parseInt(latestTimestandEpochMilli)
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
    structureRecord
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
    await readFile(`demo-data/${filePrefix}-structure.json`)
  );
  const dynamicData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-dynamic.json`)
  );
  const timestampData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-timestamp.json`)
  );

  structureData.landscapeToken = token;
  initializer?.(structureData, dynamicData);

  spanApp.get(`${spanRootUrl}/${token}/structure`, (req, res) =>
    res.json(
      structureModifier ? structureModifier(structureData) : structureData
    )
  );

  spanApp.get(`${spanRootUrl}/${token}/dynamic`, (req, res) =>
    res.json(traceModifier ? traceModifier(dynamicData) : dynamicData)
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
