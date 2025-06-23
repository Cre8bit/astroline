import * as THREE from "three";
import type { Player } from "../entities/player";
import { Controller } from "./controller";
import type { MovementIntentEnum } from "./enums/mouvementIntentEnum";

export class TrainController extends Controller {
  private readonly player: Player;
  private readonly baseSpeed: number = 4;
  private readonly maxSpeed: number = 10;
  private moveSpeed: number = this.baseSpeed;
  private stableDirection: THREE.Vector3 = new THREE.Vector3();
  private lastIntent: MovementIntentEnum = {
    direction: new THREE.Vector3(),
    targetRotation: new THREE.Quaternion(),
    speed: this.moveSpeed,
  };

  constructor(player: Player) {
    super();
    this.player = player;
  }

  computeInputIntent(): MovementIntentEnum {
    if (this.player.isOnTrain()) {
      const cameraForward = new THREE.Vector3();
      this.player.camera.getWorldDirection(cameraForward).normalize();

      const targetSpeed = this.player.controller.isShiftPressed()
        ? this.maxSpeed
        : this.baseSpeed;

      this.moveSpeed = THREE.MathUtils.lerp(this.moveSpeed, targetSpeed, 0.05);

      if (!this.stableDirection) {
        this.stableDirection = cameraForward.clone();
      } else {
        this.stableDirection.lerp(cameraForward, 0.1).normalize();
      }

      const direction = this.stableDirection.clone();

      const yaw = Math.atan2(direction.x, direction.z);
      const pitch = Math.asin(-direction.y);

      const targetEuler = new THREE.Euler(pitch, yaw, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      this.lastIntent = {
        direction: direction,
        targetRotation: targetQuat,
        speed: this.moveSpeed,
      };
    }
    return this.lastIntent;
  }
}
