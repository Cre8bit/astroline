import * as THREE from "three";
import { Controller } from "./base/controller";
import type { MovementIntent } from "../core/interfaces/movementIntent";
import type { Entity } from "../entities/entity";

export class TrainController extends Controller {
  private readonly forwardVector: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private stableDirection: THREE.Vector3 = this.forwardVector.clone();
  private moveSpeed = 4;
  private readonly baseSpeed = 4;
  private readonly maxSpeed = 10;
  private boost = false;

  setBoost(state: boolean) {
    this.boost = state;
  }

  setLookDirection(dir: THREE.Vector3) {
    this.stableDirection.lerp(dir, 0.1).normalize();
  }

  computeIntent(): MovementIntent {
    const targetSpeed = this.boost ? this.maxSpeed : this.baseSpeed;
    this.moveSpeed = THREE.MathUtils.lerp(this.moveSpeed, targetSpeed, 0.05);

    const dir = this.stableDirection.clone();
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.asin(-dir.y);
    const targetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, 0, "YXZ")
    );

    return {
      direction: dir,
      targetRotation: targetQuat,
      speed: this.moveSpeed,
    };
  }

  syncWithEntity(entity: Entity): void {
    const forward = this.forwardVector
      .clone()
      .applyQuaternion(entity.getRotation());
    this.setLookDirection(forward);
  }
}
