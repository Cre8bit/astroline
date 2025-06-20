import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 10); // Move the camera back to fit the moon

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(10, 20, 15);
scene.add(light);

const loader = new GLTFLoader();
let moon: THREE.Object3D | undefined;

loader.load(
  "/models/Moon.glb",
  (gltf) => {
    moon = gltf.scene;
    scene.add(moon);

    moon.scale.set(0.05, 0.05, 0.05);
    moon.position.set(0, 0, 0);

    camera.lookAt(moon.position);
  },
  undefined,
  (error) => {
    console.error("Error loading Moon model:", error);
  }
);

function animate(): void {
  requestAnimationFrame(animate);

  if (moon) {
    moon.rotation.y += 0.001;
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
