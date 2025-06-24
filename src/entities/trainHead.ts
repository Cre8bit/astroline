import type { MovementIntent } from "../core/interfaces/movementIntent";
import * as THREE from "three";
import { Entity } from "./entity";

export class TrainHead extends Entity {
  constructor(
    scene: THREE.Scene,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      scale?: THREE.Vector3 | number;
    }
  ) {
    super(scene, params);
    this.mass = 10;
  }
  public getRiderWorldPosition(): THREE.Vector3 {
    const localOffset = new THREE.Vector3(0, 1.8, 0);
    return localOffset.applyMatrix4(this.object.matrixWorld);
  }
  public applyIntent(intent: MovementIntent, delta: number): void {
    const displacement = intent.direction
      .clone()
      .multiplyScalar(intent.speed * delta);
    this.object.position.add(displacement);
    this.object.quaternion.slerp(intent.targetRotation, 0.1);
  }
}
