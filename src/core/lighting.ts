import * as THREE from "three";
import { scene } from "./scene";

export function setupLighting() {
  const light = new THREE.DirectionalLight(0xffffff, 10);
  light.position.set(10, 20, 15);
  scene.add(light);
}
