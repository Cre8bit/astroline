import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { camera, scene } from "../core/scene";

export const controls = new PointerLockControls(camera, document.body);
scene.add(controls.object);

document.body.addEventListener("click", () => controls.lock());

const keysPressed: { [key: string]: boolean } = {};

window.addEventListener(
  "keydown",
  (e) => (keysPressed[e.key.toLowerCase()] = true)
);
window.addEventListener(
  "keyup",
  (e) => (keysPressed[e.key.toLowerCase()] = false)
);

const velocity = new THREE.Vector3();
let moveSpeed = 0.1;

export function handleFreeCamMovement() {
  velocity.set(0, 0, 0);
  if (keysPressed["z"]) velocity.z = moveSpeed;
  if (keysPressed["s"]) velocity.z = -moveSpeed;
  if (keysPressed["q"]) velocity.x = -moveSpeed;
  if (keysPressed["d"]) velocity.x = moveSpeed;
  if (keysPressed["a"]) {
    moveSpeed = 0.5;
  } else {
    moveSpeed = 0.1;
  }
  const playerObject = controls.object;
  const playerPosition = playerObject.position;
  if (keysPressed[" "]) playerPosition.y += moveSpeed;
  if (keysPressed["shift"]) playerPosition.y -= moveSpeed;

  controls.moveRight(velocity.x);
  controls.moveForward(velocity.z);
}
