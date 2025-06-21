import * as THREE from "three";

export function setupLighting(scene: THREE.Scene) {
const light = new THREE.DirectionalLight(0xfff8e7, 20);
  light.position.set(10, 20, 15);
  scene.add(light);
}
