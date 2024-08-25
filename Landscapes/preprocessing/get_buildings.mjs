import * as fs from "fs";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

if (process.argv.length != 8) {
  console.log(
    "Usage: node get_buildings.mjs <tile_min_x> <tile_min_y> <tile_max_x> <tile_max_y> <output_dir> <osm-key>"
  );
} else {
  const osmKey = process.argv[7];
  const tileMin = [parseFloat(process.argv[2]), parseFloat(process.argv[3])];
  const tileMax = [parseFloat(process.argv[4]), parseFloat(process.argv[5])];

  const outputDir = process.argv[6];

  for (let y = tileMin[1]; y <= tileMax[1]; y++) {
    for (let x = tileMin[0]; x <= tileMax[0]; x++) {
      // TODO Paralell (ex. 10 at a time)
      const url = `https://a.data.osmbuildings.org/0.2/${osmKey}/tile/15/${x}/${y}.json`;
      console.log("Downloading", url);

      const response = await fetch(url);
      const jsonText = await response.text();
      const outputFile = outputDir + `${x}-${y}.json`;

      fs.writeFileSync(outputFile, jsonText);

      await sleep(2000);
    }
  }
}
