import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";
import type { MovementIntent } from "../core/interfaces/movementIntent";
import { Entity } from "./entity";

export class Player extends Entity {
  public controls: PointerLockControls;
  public camera: THREE.PerspectiveCamera;
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    super(scene, params);
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.controls = new PointerLockControls(this.camera, document.body);
    this.setupPlayer(
      params.position ?? new THREE.Vector3(0, 0, 0),
      params.rotation ?? new THREE.Euler(0, 0, 0)
    );
  }

  setupPlayer(
    position: THREE.Vector3 | [number, number, number],
    rotation: THREE.Euler | [number, number, number]
  ) {
    if (rotation instanceof THREE.Euler) {
      this.setPlayerRotation(rotation);
    } else if (Array.isArray(rotation)) {
      this.setPlayerRotation(
        rotation[0] ?? 0,
        rotation[1] ?? 0,
        rotation[2] ?? 0
      );
    }
    if (Array.isArray(position)) {
      this.setPlayerPosition(position[0], position[1], position[2]);
    } else {
      this.setPlayerPosition(position || new THREE.Vector3(0, 0, 0));
    }
  }
  setPlayerPosition(position: THREE.Vector3): void;
  setPlayerPosition(x: number, y: number, z: number): void;
  setPlayerPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      this.controls.object.position.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.controls.object.position.set(arg1, arg2, arg3);
    }
  }

  setPlayerRotation(rotation: THREE.Euler): void;
  setPlayerRotation(yaw: number, pitch: number, roll: number): void;
  setPlayerRotation(
    arg1: THREE.Euler | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Euler) {
      this.controls.object.rotation.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.controls.object.rotation.set(arg1, arg2, arg3);
    }
  }

  getPlayerPosition(): THREE.Vector3 {
    return this.controls.object.position.clone();
  }

  public applyIntent(intent: MovementIntent, delta: number) {
    this.controls.object.position.add(
      intent.direction.clone().multiplyScalar(intent.speed * delta)
    );
  }
}
