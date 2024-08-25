import * as fs from "fs";
import SnapFeatures from "@kylebarron/snap-to-tin/dist/snap-features-to-mesh.js";

function readOBJ(fileName) {
  const objData = fs.readFileSync(fileName, { encoding: "utf-8" });
  let vertices = [];
  let triangles = [];
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

if (process.argv.length != 7) {
  console.log(
    "Usage: node clamp_path.js <input_geojson> <obj_file> <ref_point_x> <ref_point_y> <output_geojson>"
  );
} else {
  const inputGeoJSON = process.argv[2];
  const inputOBJ = process.argv[3];
  const refPoint = [parseFloat(process.argv[4]), parseFloat(process.argv[5])];

  const outputGeoJSON = process.argv[6];

  const track = JSON.parse(fs.readFileSync(inputGeoJSON));
  const features = track.features;

  // convert from MultiLinestring to LineString
  features[0].geometry.type = "LineString";
  features[0].geometry.coordinates = features[0].geometry.coordinates[0];

  // convert to 2D coordinates, relative to refpoint (lower left corner) for terrain
  const localCoordinates = features[0].geometry.coordinates.map((p) => {
    return [p[0] - refPoint[0], p[1] - refPoint[1]];
  });
  features[0].geometry.coordinates = localCoordinates;

  const { vertices, triangles } = readOBJ(inputOBJ);

  const snap = new SnapFeatures({
    indices: new Int32Array(triangles.flat()),
    positions: new Float32Array(vertices.flat()),
    bounds: [0, 0, 4000, 4000],
  });

  const snappedFeatures = snap.snapFeatures({ features });

  // snapping creates a coordinate array of mixed native and Float32Arrays,
  // this creates chaos when serializing to JSON, so normalize
  const unifiedCoordinates = snappedFeatures[0].geometry.coordinates.map(
    (p) => {
      return [p[0], p[1], p[2]];
    }
  );
  snappedFeatures[0].geometry.coordinates = unifiedCoordinates;

  // overwrite original track with snapped features
  // and keep the remaining metadata from the original file
  track.features = snappedFeatures;

  fs.writeFileSync(outputGeoJSON, JSON.stringify(track));
}
