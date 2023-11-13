const express = require("express");
const { readFile, writeFile } = require("node:fs/promises");
const { createHash } = require("crypto");
const cors = require("cors");
const compression = require("compression");
const {
  removeRandomTraces,
  recursivelyRandomizeAllHashCodesOfPackages,
  copyPackageAndTraces,
  createRandomHex,
  findFirstCommit,
} = require("./utils.js");

const path = require("path");
const fs = require("fs");
const { readFileSync } = require("node:fs");

const landscapeApp = createExpressApplication(8082);
const traceApp = createExpressApplication(8083);
const userApp = createExpressApplication(8084);

const landscapeRootUrl = "/v2/landscapes";
const traceRootUrl = "/v2/landscapes";
const userRootUrl = "/user/:uid/token";

(async () => {
  const user = JSON.parse(await readFile("./user.json"));
  userApp.get(`${userRootUrl}`, (req, res) => res.json(user));
})();

createLandscapeSample({
  filePrefix: "fibonacci",
  token: "17844195-6144-4254-a17b-0f7fb49adb0a",
});

createLandscapeSample({
  filePrefix: "petclinic-distributed",
  token: "26844195-7235-4254-a17b-0f7fb49adb0a",
});

createLandscapeSample({
  filePrefix: "petclinic",
  token: "19844195-7235-4254-a17b-0f7fb49adb0a",
  traceModifier: removeRandomTraces,
});

createLandscapeSample({
  filePrefix: "big-landscape",
  token: "a87167e5-8ec1-4b98-830a-dba87d213bb0",
});

createLandscapeSample({
  filePrefix: "study",
  token: "36844495-7235-4254-a17b-0f7fb49adb0a",
});

createLandscapeSample({
  filePrefix: "vissoft23",
  token: "12444195-6144-4254-a17b-asdgfewefg",
});

//console.log(findFirstCommit("petclinic", "main"));

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
        previousStructure
      );
      previousStructure = newStructure;

      return previousStructure;
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

createLandscapeSample({
  filePrefix: "plantuml",
  token: "somerandomtoken",
});

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
 *  initializer?: (structure, trace) => void
 * }} options
 */
async function createLandscapeSample({
  filePrefix,
  token,
  traceModifier,
  structureModifier,
  initializer,
}) {
  const structureData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-structure.json`)
  );

  const dynamicData = JSON.parse(
    await readFile(`demo-data/${filePrefix}-dynamic.json`)
  );

  if (filePrefix === "petclinic") {
    // currently only petclinic evolution files available
    const evolutionDataBranches = JSON.parse(
      await readFile(`demo-data/evolution/${filePrefix}/branches.json`)
    );

    landscapeApp.get(`${landscapeRootUrl}/${token}/branches`, (req, res) =>
      res.json(evolutionDataBranches)
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-report/:cid`,
      async (req, res) => {
        const commitData = await readFile(
          `demo-data/evolution/${filePrefix}/commit-reports/CommitReport_${req.params.cid}.json`
        );
        const commitDataParsed = JSON.parse(commitData);
        res.json(commitDataParsed);
      }
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-structure/:cid`,
      async (req, res) => {
        let commitStructureData;
        if (req.params.cid !== "923e2b7aa331b8194a6579da99fb6388f15d7f3e") {
          commitStructureData = await readFile(
            `demo-data/${filePrefix}-structure.json`
          );
        } else {
          commitStructureData = await readFile(
            `demo-data/evolution/${filePrefix}/commit-structure/CommitStructure_${req.params.cid}.json`
          );
        }
        const commitStructureDataParsed = JSON.parse(commitStructureData);
        res.json(commitStructureDataParsed);
      }
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-dynamic/:cid`,
      async (req, res) => {
        res.json(traceModifier ? traceModifier(dynamicData) : dynamicData);
      }
    );
  }

  if (filePrefix === "plantuml") {
    // currently only petclinic evolution files available
    const evolutionDataBranches = JSON.parse(
      await readFile(`demo-data/evolution/${filePrefix}/branches.json`)
    );

    landscapeApp.get(`${landscapeRootUrl}/${token}/branches`, (req, res) =>
      res.json(evolutionDataBranches)
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-report/:cid`,
      async (req, res) => {
        const commitData = await readFile(
          `demo-data/evolution/${filePrefix}/analysis-data/CommitReport_${req.params.cid}.json`
        );
        const commitDataParsed = JSON.parse(commitData);
        res.json(commitDataParsed);
      }
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-structure/:cid`,
      async (req, res) => {
        const commitStructureData = await readFile(
          `demo-data/${filePrefix}-structure.json`
        );
        const commitStructureDataParsed = JSON.parse(commitStructureData);
        res.json(commitStructureDataParsed);
      }
    );

    landscapeApp.get(
      `${landscapeRootUrl}/${token}/commit-dynamic/:cid`,
      async (req, res) => {
        res.json(traceModifier ? traceModifier(dynamicData) : dynamicData);
      }
    );
  }

  structureData.landscapeToken = token;
  initializer?.(structureData, dynamicData);

  landscapeApp.get(`${landscapeRootUrl}/${token}/structure`, (req, res) => {
    console.log(filePrefix);
    res.json(
      structureModifier ? structureModifier(structureData) : structureData
    );
  });

  traceApp.get(`${traceRootUrl}/${token}/dynamic`, (req, res) =>
    res.json(traceModifier ? traceModifier(dynamicData) : dynamicData)
  );
}

// -----------------------------------------------------------------

async function createApplicationStructureFromCommitReport(
  commitReport,
  applicationName,
  landscapeToken
) {
  const nodeStructure = {
    landscapeToken: "somerandomtoken",
    nodes: [
      {
        ipAddress: "0.0.0.0",
        hostName: "randomhostname",
        applications: [],
      },
    ],
  };

  const applicationStructure = {
    name: applicationName,
    language: "java", // we only consider java projects
    instanceId: "0",
    packages: [],
  };

  // Compute packages
  const packageNameToPackageMap = new Map();
  const fqnClassNameToClass = new Map();
  const firstLevelPackageNames = new Set();
  const functionFQN = new Set();

  const commitId = commitReport.commitID;

  console.log(commitReport.files.length);

  let counter = 0;

  for (const file of commitReport.files) {
    counter += 1;
    const fileAndFolders = file.split("/");
    const fileName = fileAndFolders[fileAndFolders.length - 1];
    const fileNameWithoutFileFormat = fileName.split(".")[0];

    console.log(counter + " " + fileNameWithoutFileFormat);

    try {
      const analysisDataRaw = await readFile(
        `demo-data/evolution/${applicationName}/analysis-data/${fileNameWithoutFileFormat}_${commitId}.json`
      );
      const analysisData = JSON.parse(analysisDataRaw);

      if (analysisData) {
        const packageName = analysisData.packageName;
        const packages = packageName.split(".");
        let currentPackage = undefined;
        let parentPackage = undefined;
        for (let i = 0; i < packages.length; i++) {
          const currentPackageName = packages[i];
          if (i === 0 && !firstLevelPackageNames.has(currentPackageName)) {
            firstLevelPackageNames.add(currentPackageName);
          }

          let id = packages[0];
          for (let j = 0; j < i; j++) {
            id += "." + packages[j + 1];
          }

          currentPackage = packageNameToPackageMap.get(id); // use full qualified name as id to avoid name clashes
          if (!currentPackage) {
            currentPackage = {
              name: currentPackageName,
              subPackages: [],
              classes: [],
            };
            packageNameToPackageMap.set(id, currentPackage);
          }

          if (parentPackage) {
            if (!parentPackage.subPackages.includes(currentPackage)) {
              parentPackage.subPackages.push(currentPackage);
            }
          }

          parentPackage = currentPackage;
        }

        const id = packageName + "fileNameWithoutFileFormat";
        let clazz = fqnClassNameToClass.get(id);
        if (!clazz) {
          clazz = {
            name: fileNameWithoutFileFormat,
            methods: [],
          };
          fqnClassNameToClass.set(id, clazz);
        }

        // fill clazz with methods
        if (
          !analysisData.classData ||
          !analysisData.classData[`${packageName}.${fileNameWithoutFileFormat}`]
        ) {
          continue;
        }
        const methodData =
          analysisData.classData[`${packageName}.${fileNameWithoutFileFormat}`]
            .methodData;
        const superClass =
          analysisData.classData[`${packageName}.${fileNameWithoutFileFormat}`]
            .superClass;

        if (methodData) {
          for (const key of Object.keys(methodData)) {
            const temp = key.split(".");
            const temp2 = temp[temp.length - 1].split("#");
            const prefixFQN = temp.slice(0, temp.length - 1);
            const methodName = temp2[0]; // TODO: if methodName is constructor we write <init>
            const methodFQN = [...prefixFQN, methodName].join(".");

            if (!functionFQN.has(methodFQN)) {
              const method = {
                name: methodName,
                hash: createHash("sha256")
                  .update(`${landscapeToken}${methodFQN}`)
                  .digest("hex"),
              };
              clazz.methods.push(method);
              functionFQN.add(methodFQN);
            }

            // if(methodData[`${key}`].parameter){
            //  Parameters part of function name?
            // }
          }

          if (!currentPackage.classes.includes(clazz)) {
            currentPackage.classes.push(clazz);
          }
        }

        if (superClass) {
          clazz.superClass = superClass;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  firstLevelPackageNames.forEach((name) =>
    applicationStructure.packages.push(packageNameToPackageMap.get(name))
  );
  // // TODO: method hash
  nodeStructure.nodes[0].applications.push(applicationStructure);
  writeFile(
    "demo-data/plantuml-structure.json",
    JSON.stringify(nodeStructure),
    (err) => {
      if (err) {
        throw err;
      }
    }
  );

  // for (const file of commitReport.files){
  //   let parentPackage = undefined;
  //   let counter = 0;

  //   for(const path of paths){
  //     if(file.startsWith(path)){
  //       const x = file.replace(path, "");
  //       const ys = x.split("/");
  //       for(const y of ys){
  //         if(y.endsWith(".java")){
  //           // java file
  //           if(parentPackage){
  //             parentPackage.classes.push(y);
  //           }
  //         }else {
  //           // package

  //           if(counter === 0){
  //             firstLevelPackageNames.add(y);
  //           }

  //           let currentPackage = packageNameToPackageMap.get(y);

  //           if(!currentPackage) {
  //             currentPackage = {
  //               name: y,
  //               subPackages: [],
  //               classes: []
  //             };
  //             packageNameToPackageMap.set(y, currentPackage);
  //           }

  //           if(parentPackage){
  //             if(!parentPackage.subPackages.includes(currentPackage)){
  //               parentPackage.subPackages.push(currentPackage);
  //             }
  //           }

  //           parentPackage = currentPackage;
  //         }
  //         counter++;
  //       }
  //       break;
  //     }
  //   }
  // }

  // // applicationStructure.subPackages.push(packageNameToPackageMap.get(name))
  // firstLevelPackageNames.forEach(name => applicationStructure.packages.push(packageNameToPackageMap.get(name)));
  // // TODO: method hash

  // console.log(JSON.stringify(applicationStructure));
}

// Takes a list of commit reports of an application and creates a commit tree structure. Precondition: the commits of the same branch must be ordered!
// function createCommitTreeStructureFromCommitReports(commitReportList){
//   const branchNameToCommitList = new Map();

//   for(const commitReport of commitReportList) {
//     console.log("COMMIT REPORT: ", commitReport);
//     const branchName = commitReport.branchName;
//     const commitList = branchNameToCommitList.get(branchName);
//     const commitId = commitReport.commitID;
//     if(commitList){
//       commitList.push(commitId);
//     }else {
//       branchNameToCommitList.set(branchName, [commitId]);
//     }
//   }

//   // branchNameToCommitList.forEach((value,key) => {
//   //   console.log("VALUE ", value);
//   //   console.log("KEY ", key);
//   // });

// }

// function orderCommitReports(){

//   const commitReportsPath = path.resolve(__dirname,"demo-data","evolution","plantuml","analysis-data");
//   const results = fs.readdirSync(commitReportsPath).filter(filename => filename.startsWith("CommitReport") ? true : false);

//   results.sort((a,b) => {
//     const splitA =  a.split("_");
//     const commitNrA =splitA[splitA.length - 1];

//     const splitB =  b.split("_");
//     const commitNrB =splitB[splitB.length - 1];

//     if(parseInt(commitNrA) < parseInt(commitNrB)){
//       return -1;
//     }else if(parseInt(commitNrA) === parseInt(commitNrB)){
//       return 0;
//     }else {
//       return 1;
//     }
//   });

//   const branchNameToCommitList = new Map();
//   const commitIdToBranchName = new Map();
//   let mainBranch;
//   const fileNameSplit = results[0].split("_");
//   const earliestCommitNumber = parseInt(fileNameSplit[fileNameSplit.length - 1]);
//   let currentCommitNumber = earliestCommitNumber;

//   results.forEach(fileName => {

//     const commitReport = readFileSync(`demo-data/evolution/plantuml/analysis-data/${fileName}`, "utf-8");
//     const commitReportJson = JSON.parse(commitReport);

//     const branchName = commitReportJson.branchName;
//     const commitList = branchNameToCommitList.get(branchName);
//     const commitId = commitReportJson.commitID;
//     const parentCommitId = commitReportJson.parentCommitID;

//     const fileNameSplit = fileName.split("_");
//     const commitNumber = parseInt(fileNameSplit[fileNameSplit.length - 1]);

//     if(parentCommitId === "NONE"){
//       mainBranch = branchName;
//     }

//     if(commitList){
//       commitList.push(commitId);
//     }else {
//       branchNameToCommitList.set(branchName, [commitId]);
//     }
//   });

//   const branches = {
//     applications: [],
//   }

//   const application = {
//     name: "plantuml",
//     branches: []
//   }

//   branchNameToCommitList.forEach((val,key) => {
//     console.log(val, key);
//   });

// }

async function testApplicationStructure() {
  const commitReport = await readFile(
    `demo-data/evolution/plantuml/analysis-data/CommitReport_4f46b6726efe1937b6edefaf62e6b4a88c534217_0.json`
  );
  createApplicationStructureFromCommitReport(
    JSON.parse(commitReport),
    "plantuml",
    "somerandomtoken"
  );
}

testApplicationStructure();
//orderCommitReports();
