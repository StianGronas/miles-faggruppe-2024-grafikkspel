import proj4 from "proj4";
import earcut from "earcut";
import * as fs from "fs";
import bvhtree from "bvh-tree-plus";

const EPSG_25833 = "+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs";

function getHeight(properties) {
  // if the building height is defined, use it
  if (properties.height) return properties.height;

  // if not, see if we know the number of floors, and assume a total height of 3 meters per floor
  if (properties.levels) return properties.levels * 3;

  // else, assume the building height is 3 meters
  return 3;
}

function toUTM33(coordinates) {
  return coordinates.map((wgsVertex) => {
    return proj4(EPSG_25833, wgsVertex);
  });
}

function createWalls(groundVertices, roofVertices) {
  const wallVertices = [];
  for (let i = 0; i < groundVertices.length - 1; i++) {
    wallVertices.push(groundVertices[i + 1]);
    wallVertices.push(groundVertices[i]);
    wallVertices.push(roofVertices[i + 1]);
    wallVertices.push(roofVertices[i + 1]);
    wallVertices.push(groundVertices[i]);
    wallVertices.push(roofVertices[i]);
  }
  return wallVertices;
}

function createRoof(roofVertices) {
  // adapt input to earcut: remove last vertex (it is a duplicate of the first) and flatten the array
  const vertices = roofVertices.slice(0, -1).flat();

  // tell earcut to triangulate without holes and that the input data has 3 dimensions
  const triangles = earcut(vertices, null, 3);

  // map triangle indices to vertices and return vertex list
  return triangles.map((index) => {
    return [
      vertices[3 * index],
      vertices[3 * index + 1],
      vertices[3 * index + 2],
    ];
  });
}

function readOBJ(fileName) {
  const objData = fs.readFileSync(fileName, { encoding: "utf-8" });
  const vertices = [];
  const triangles = [];
  objData.split(/\r?\n/).forEach((line) => {
    const lineTokens = line.split(" ");
    switch (lineTokens[0]) {
      case "v":
        // "+": cast a string to a number
        vertices.push([+lineTokens[1], +lineTokens[2], +lineTokens[3]]);
        break;
      case "f":
        const vertex = new Array(lineTokens.length - 1);
        for (let i = 1; i < lineTokens.length; ++i) {
          const indices = lineTokens[i].split("/");
          vertex[i - 1] = indices[0] - 1; // vertex index
        }
        triangles.push(vertex);
        break;
    }
  });
  return { vertices, triangles };
}

function initializeBVH(fileName) {
  const { vertices, triangles } = readOBJ(fileName);

  const triangleList = [];
  triangles.forEach((tri) => {
    triangleList.push(vertices[tri[0]]);
    triangleList.push(vertices[tri[1]]);
    triangleList.push(vertices[tri[2]]);
  });

  return new bvhtree.BVH(triangleList.flat(), 5);
}

function getTerrainElevation(bvh, location) {
  const rayOrigin = { x: location[0], y: location[1], z: 10000 };
  const rayDirection = { x: 0, y: 0, z: -1 };
  const intersection = bvh.intersectRay(rayOrigin, rayDirection, true);
  return intersection[0].intersectionPoint.z;
}

function getBuildingMesh(vertices, height, refPoint, bvh) {
  const groundElevations = vertices.map((v) => {
    const vertexLocation = [v[0] - refPoint[0], v[1] - refPoint[1]];
    return getTerrainElevation(bvh, vertexLocation);
  });

  const minElevation = Math.min(...groundElevations);

  const groundVertices = vertices.map((v) => {
    return [v[0] - refPoint[0], v[1] - refPoint[1], minElevation];
  });

  const roofVertices = vertices.map((v) => {
    return [v[0] - refPoint[0], v[1] - refPoint[1], minElevation + height];
  });

  const buildingVertices = [];
  buildingVertices.push(...createWalls(groundVertices, roofVertices));
  buildingVertices.push(...createRoof(roofVertices));
  return buildingVertices;
}

function toOBJVertices(vertices) {
  let verticesString = "";
  vertices.forEach((v) => {
    verticesString += `v ${v[0].toFixed(3)} ${v[1].toFixed(3)} ${v[2].toFixed(
      3
    )}\n`;
  });

  return verticesString;
}

function toOBJIndices(vertices, offset) {
  let indicesString = "";
  for (let i = offset; i <= vertices.length + offset; i += 3) {
    indicesString += `f ${i} ${i + 1} ${i + 2}\n`;
  }

  return indicesString;
}

if (process.argv.length != 7) {
  console.log(
    "Usage: node osm_to_obj.js <ref_point_x> <ref_point_y> <terrain_obj> <input data dir> <output obj_file>"
  );
} else {
  const refPoint = [parseFloat(process.argv[2]), parseFloat(process.argv[3])];
  const bvh = initializeBVH(process.argv[4]);
  const inputDir = process.argv[5];
  const inputFiles = fs
    .readdirSync(inputDir)
    .filter((fileName) => fileName.endsWith(".json"));

  const outputFile = process.argv[6];

  let objVertices = "";
  let objIndices = "";
  let totalVertices = 1;

  inputFiles.forEach((fileName) => {
    const fileData = fs.readFileSync(inputDir + fileName);

    // guard against empty tiles (when there are no buildings in a tile)
    if (fileData.length > 0) {
      const buildings = JSON.parse(fileData);

      buildings.features.forEach((building) => {
        const buildingHeight = getHeight(building.properties);
        const buildingOutline = toUTM33(building.geometry.coordinates[0]);

        const meshVertices = getBuildingMesh(
          buildingOutline,
          buildingHeight,
          refPoint,
          bvh
        );

        objVertices += toOBJVertices(meshVertices);
        objIndices += toOBJIndices(meshVertices, totalVertices);

        totalVertices += meshVertices.length;
      });
    }
  });

  fs.writeFileSync(outputFile, objVertices + objIndices);
}
