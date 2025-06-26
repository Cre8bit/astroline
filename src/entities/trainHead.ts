import type { MovementIntent } from "../core/interfaces/movementIntent";
import * as THREE from "three";
import { Entity } from "./entity";

export class TrainHead extends Entity {
  private readonly riderlocalOffset = new THREE.Vector3(0, 1.8, 0);
  constructor(
    scene: THREE.Scene,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | THREE.Quaternion | [number, number, number];
      scale?: THREE.Vector3 | number;
      riderOffset?: THREE.Vector3 | [number, number, number];
    }
  ) {
    super(scene, params);
    this.mass = 10;
    if (params.riderOffset) {
      this.setRiderOffset(params.riderOffset);
    }
  }
  public getRiderWorldPosition(): THREE.Vector3 {
    return this.riderlocalOffset.clone().applyMatrix4(this.object.matrixWorld);
  }
  setRiderOffset(offset: THREE.Vector3 | [number, number, number]): void {
    if (offset instanceof THREE.Vector3) {
      this.riderlocalOffset.copy(offset);
    } else if (Array.isArray(offset)) {
      this.riderlocalOffset.set(offset[0] ?? 0, offset[1] ?? 0, offset[2] ?? 0);
    }
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
