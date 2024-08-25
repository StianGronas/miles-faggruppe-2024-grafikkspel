import * as THREE from "three";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("webgl");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1.0,
  10000
);

camera.position.set(4000, 2000, 1500);
camera.up.set(0, 0, 1);

const controls = new OrbitControls(camera, canvas);
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.5;
controls.rotateSpeed = 0.2;

controls.update();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0.05, 0.35, 0.8);

const light = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(light);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.position.set(0, 0, 1);
scene.add(directionalLight);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight2.position.set(-0.2, 0, 0.8);
scene.add(directionalLight2);

let terrainMesh;

const loader = new GLTFLoader();
loader.load(
  "terrain.glb",
  function (glb) {
    terrainMesh = glb.scene.children[0];
    terrainMesh.geometry.computeVertexNormals();
    scene.add(terrainMesh);

    controls.target.copy(terrainMesh.geometry.boundingSphere.center);

    loadTrack("track.geojson");
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  function (error) {
    console.log("An error happened");
  }
);

loader.load(
  "buildings.glb",
  function (glb) {
    buildingMesh = glb.scene.children[0];
    buildingMesh.material.color.set(0xffffff);
    scene.add(buildingMesh);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  function (error) {
    console.log("An error happened");
  }
);

window.addEventListener("resize", () => {
  resetViewport();
});

resetViewport();
drawScene();

function loadTrack(fileName) {
  fetch(fileName)
    .then((response) => response.json())
    .then((json) => {
      const coordinates = json.features[0].geometry.coordinates;
      const vectorPoints = coordinates.map((p) => {
        return new THREE.Vector3(p[0], p[1], p[2]);
      });
      const curve = new THREE.CatmullRomCurve3(vectorPoints);
      const geometry = new THREE.TubeGeometry(curve, 1000, 5, 8);
      const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });

      const trackMesh = new THREE.Mesh(geometry, material);
      scene.add(trackMesh);
    });
}

function drawScene() {
  requestAnimationFrame(drawScene);

  controls.update();
  renderer.render(scene, camera);
}

function resetViewport() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  controls.update();
}
