import * as THREE from 'three';

const scene = new THREE.Scene();
// FOV, aspect ratio (uses width/height to get correct aspect ratio), near plane, far plane
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(0x000000);
// Resolution of renderer: default window size
renderer.setSize(window.innerWidth, window.innerHeight);
// Half resolution but uses the same size
// renderer.setSize(window.innerWidth / 2, window.innerHeight / 2, false);
// Adds canvas to html page
document.body.appendChild(renderer.domElement);

const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
const sunTexture = new THREE.TextureLoader().load('src/assets/sun.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);

const earthOrbitNode = new THREE.Object3D();
const earthGeometry = new THREE.SphereGeometry(2, 64, 64);
const earthTexture = new THREE.TextureLoader().load('src/assets/earth_daymap.jpg');
const earthMaterial = new THREE.MeshBasicMaterial({ map: earthTexture });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);

earth.position.x = 20;

scene.add(sun);
scene.add(earthOrbitNode);
earthOrbitNode.add(earth);

camera.position.z = 30;
camera.position.y = 10;
camera.rotation.y = 0;
camera.rotation.x = -0.2;

const speed = 1;

const rotateObject = (object: THREE.Object3D, rotation: [number, number, number]) => {
  object.rotation.x += rotation[0] * speed;
  object.rotation.y += rotation[1] * speed;
  object.rotation.z += rotation[2] * speed;
}

function animate() {
  requestAnimationFrame(animate);

  // Call stuff to update scene
  rotateObject(sun, [0.0, 0.002, 0.0]);
  rotateObject(earthOrbitNode, [0, 0.01, 0])
  rotateObject(earth, [0.0, 0.02, 0.0]);
  
  renderer.render(scene, camera);
}
animate();