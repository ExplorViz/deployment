const express = require("express");
const { readFile } = require("node:fs/promises");
const cors = require("cors");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const spanApp = createExpressApplication(8083);
const userApp = createExpressApplication(8084);
const evolutionApp = createExpressApplication(8085);

const spanRootUrl = "/v2/landscapes";
const userRootUrl = "/user/:uid/token";
const snapshotRootUrl = "/snapshot";
const evolutionRootUrl = "/v2/code";

const landscapes = [];

// Request for list of landscapes
(async () => {
  userApp.get(`${userRootUrl}`, (req, res) => res.json(landscapes));
})();

// Return empty list for snapshot requests
(async () => {
  userApp.get(`${snapshotRootUrl}`, (req, res) =>
    res.json({
      personalSnapshots: [],
      sharedSnapshots: [],
      subscribedSnapshots: [],
    })
  );
})();

iterateOverDemoData("demo-data");

async function iterateOverDemoData(directoryPath) {
  fs.readdir(directoryPath, (err, folders) => {
    if (err) {
      console.error(`Error reading directory: ${err.message}`);
      return;
    }

    folders.forEach((folder) => {
      const filePath = path.join(directoryPath, folder);

      // Check if it's a file or a directory
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file: ${err.message}`);
          return;
        }

        if (stats.isDirectory()) {
          createLandscapeSample({ folder: folder });
        }
      });
    });
  });
}

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
 *  folder: string;
 *  token: string;
 *  traceModifier?: DataModifier,
 *  structureModifier?: DataModifier,
 *  timestampModifier?: DataModifier,
 *  initializer?: (structure, trace) => void
 * }} options
 */
async function createLandscapeSample({
  folder,
  token,
  alias,
  traceModifier,
  structureModifier,
  timestampModifier,
  initializer,
}) {
  let structureData, dynamicData, timestampData;

  try {
    structureData = JSON.parse(await readFile(`demo-data/${folder}/structure.json`));
  } catch {
    structureData = { landscapeToken: token, nodes: [] };
    console.error("Could not read structure data for:", folder);
  }

  const landscapeToken = token ? token : structureData.landscapeToken;

  spanApp.get(`${spanRootUrl}/${landscapeToken}/structure`, (req, res) =>
    res.json(structureModifier ? structureModifier(structureData) : structureData)
  );

  try {
    dynamicData = JSON.parse(await readFile(`demo-data/${folder}/dynamic.json`));
  } catch {
    dynamicData = [];
    console.error("Could not read dynamic data for:", folder);
  }

  spanApp.get(`${spanRootUrl}/${landscapeToken}/dynamic`, (req, res) =>
    res.json(traceModifier ? traceModifier(dynamicData) : dynamicData)
  );
  initializer?.(structureData, dynamicData);

  try {
    timestampData = JSON.parse(await readFile(`demo-data/${folder}/timestamps.json`));
  } catch {
    timestampData = [
      {
        epochMilli: 0,
        spanCount: 0,
      },
    ];
    console.error("Could not read timestamps for:", folder);
  }

  spanApp.get(`${spanRootUrl}/${landscapeToken}/timestamps`, async (req, res) => {
    const potentialLatestTimestamp = req.query.newest;
    const commit = req.query.commit;

    let timestampData;

    // Use try-catch block since we only provide a mockup for the evolution to the distributed-petclinic by now
    try {
      const commitIdToTimestampsMap = JSON.parse(
        await readFile(`demo-data/petclinic-distributed-commit-timestamps.json`)
      );
      timestampData = commit ? commitIdToTimestampsMap[commit] ?? [] : commitIdToTimestampsMap["cross-commit"];
    } catch (error) {
      timestampData = JSON.parse(await readFile(`demo-data/${folder}/timestamps.json`));
    }

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

  landscapes.push({
    value: landscapeToken,
    ownerId: "github|123456",
    created: timestampData && timestampData.length > 0 ? timestampData[0].epochMilli : 0,
    alias: alias ? alias : folder,
    sharedUsersIds: [],
  });

  try {
    await readFile(`demo-data/${folder}/application-names.json`);
    // Application names found => csode evolution data is present
    provideEvolutionData(folder, landscapeToken);
  } catch {
    // No demo data for code evolution - this is expected, do not throw error
    // Return empty list of applications since no data is available
    evolutionApp.get(`${evolutionRootUrl}/applications/${landscapeToken}`, (req, res) => {
      res.json([]);
    });
    return;
  }
}

async function provideEvolutionData(folder, landscapeToken) {
  // ToDo: Refactor such function can handle if individual files are missing
  try {
    const fileContentAppNames = await readFile(`demo-data/${folder}/application-names.json`);
    const applicationNames = JSON.parse(fileContentAppNames);

    const fileContentCommitTrees = await readFile(`demo-data/${folder}/commit-trees.json`);
    const appNameToCommitTreeMap = JSON.parse(fileContentCommitTrees);

    const fileContentStructures = await readFile(`demo-data/${folder}/evolution-structures.json`);
    const commitIdToStructureMap = JSON.parse(fileContentStructures);

    const fileContentMetrics = await readFile(`demo-data/${folder}/evolution-metrics.json`);
    const commitIdToMetricsMap = JSON.parse(fileContentMetrics);

    const fileContentCommitComparisons = await readFile(`demo-data/${folder}/commit-comparisons.json`);
    const commitIdsToCommitComparisonMap = JSON.parse(fileContentCommitComparisons);

    if (applicationNames) {
      evolutionApp.get(`${evolutionRootUrl}/applications/${landscapeToken}`, (req, res) => {
        res.json(applicationNames);
      });

      for (const appName of applicationNames) {
        evolutionApp.get(`${evolutionRootUrl}/commit-tree/${landscapeToken}/${appName}/`, (req, res) => {
          res.json(appNameToCommitTreeMap[appName]);
        });
        evolutionApp.get(`${evolutionRootUrl}/structure/${landscapeToken}/${appName}/:commitId`, (req, res) => {
          const landscapeStructure = commitIdToStructureMap[req.params["commitId"]] ?? { nodes: [] };
          landscapeStructure.landscapeToken = landscapeToken;
          res.json(landscapeStructure);
        });
        evolutionApp.get(`${evolutionRootUrl}/metrics/${landscapeToken}/${appName}/:commitId`, (req, res) => {
          const metrics = commitIdToMetricsMap[req.params["commitId"]] ?? {
            files: [],
            fileMetrics: [],
            classMetrics: [],
            methodMetrics: [],
          };
          res.json(metrics);
        });
        evolutionApp.get(
          `${evolutionRootUrl}/commit-comparison/${landscapeToken}/${appName}/:commitIds`,
          (req, res) => {
            const commitComparison = commitIdsToCommitComparisonMap[req.params["commitIds"]] ?? {
              modified: [],
              added: [],
              deleted: [],
              addedPackages: [],
              deletedPackages: [],
              metrics: [],
            };
            res.json(commitComparison);
          }
        );
      }
    }
  } catch (error) {
    console.log(error);
  }
}
