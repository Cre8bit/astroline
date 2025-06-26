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
      rotation?: THREE.Euler | THREE.Quaternion | [number, number, number];
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

    this.syncControlsWithEntity();
  }

  private syncControlsWithEntity() {
    this.syncControlsWithEntityPosition();
    this.syncControlsWithEntityRotation();
  }
  private syncControlsWithEntityRotation(): void {
    this.controls.object.quaternion.copy(this.rotation);
    this.controls.object.rotation.setFromQuaternion(this.rotation);
  }
  private syncControlsWithEntityPosition(): void {
    this.controls.object.position.copy(this.position);
  }

  override setPosition(position: THREE.Vector3): void;
  override setPosition(x: number, y: number, z: number): void;
  override setPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      super.setPosition(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      super.setPosition(arg1, arg2, arg3);
    }
    this.syncControlsWithEntityPosition();
  }

  override addToPosition(position: THREE.Vector3): void;
  override addToPosition(x: number, y: number, z: number): void;
  override addToPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      super.addToPosition(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      super.addToPosition(arg1, arg2, arg3);
    }
    this.syncControlsWithEntityPosition();
  }

  override setRotation(rotation: THREE.Euler): void;
  override setRotation(rotation: THREE.Quaternion): void;
  override setRotation(x: number, y: number, z: number): void;
  override setRotation(
    arg1: THREE.Euler | THREE.Quaternion | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Euler) {
      super.setRotation(arg1);
    } else if (arg1 instanceof THREE.Quaternion) {
      super.setRotation(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      super.setRotation(arg1, arg2, arg3);
    }
    this.syncControlsWithEntityRotation();
  }

  getPlayerPosition(): THREE.Vector3 {
    return this.controls.object.position.clone();
  }

  public applyIntent(intent: MovementIntent, delta: number): void {
    const displacement = intent.direction
      .clone()
      .multiplyScalar(intent.speed * delta);
    this.addToPosition(displacement);

    this.setRotation(intent.targetRotation);

    this.updateObjectTransform();
  }
}
