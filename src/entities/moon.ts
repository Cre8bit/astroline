import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { scene, camera } from "../core/scene";

export const moon: { value: THREE.Object3D | undefined } = { value: undefined };

// Adjusted to allow reassignment of 'moon'

export function loadMoonModel() {
  const loader = new GLTFLoader();
  loader.load(
    "/models/Moon.glb",
    (gltf) => {
      moon.value = gltf.scene;
      scene.add(moon.value);
      moon.value.scale.set(1, 1, 1);
      moon.value.position.set(0, 0, 0);
      camera.lookAt(moon.value.position);
    },
    undefined,
    (error) => {
      console.error("Error loading Moon model:", error);
    }
  );
}
