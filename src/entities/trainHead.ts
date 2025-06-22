import { Entity } from "../core/entity";
import type { Player } from "./player";
import * as THREE from "three";

export class TrainHead extends Entity {
  private readonly player: Player;
  private readonly baseSpeed: number = 4;
  private readonly maxSpeed: number = 10;
  private currentSpeed: number = this.baseSpeed;
  private stableDirection: THREE.Vector3 | null = null;
  constructor(
    scene: THREE.Scene,
    player: Player,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      scale?: THREE.Vector3 | number;
    }
  ) {
    super(scene, params);
    this.mass = 10;
    this.player = player;
  }

  public getPlayer(): Player {
    return this.player;
  }
  handleTrainMovement(delta: number) {
    if (this.player.isOnTrain()) {
      const cameraForward = new THREE.Vector3();
      this.player.camera.getWorldDirection(cameraForward).normalize();

      const targetSpeed = this.player.isShiftPressed()
        ? this.maxSpeed
        : this.baseSpeed;

      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        targetSpeed,
        0.05
      );

      this.velocity = cameraForward.clone().multiplyScalar(this.currentSpeed);

      if (!this.stableDirection) {
        this.stableDirection = cameraForward.clone();
      } else {
        this.stableDirection.lerp(cameraForward, 0.1).normalize();
      }

      const dir = this.stableDirection.clone();
      const yaw = Math.atan2(dir.x, dir.z);
      const pitch = Math.asin(-dir.y);

      const targetEuler = new THREE.Euler(pitch, yaw, 0, "YXZ");
      const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

      this.object.quaternion.slerp(targetQuat, 0.1);
    }

    const displacement = this.velocity.clone().multiplyScalar(delta);
    this.object.position.add(displacement);

    if (this.player.isOnTrain()) {
      const localOffset = new THREE.Vector3(0, 1.8, 0);
      const worldPos = localOffset.applyMatrix4(this.object.matrixWorld);

      const currentPos = this.player.getPlayerPosition();
      const smoothedPos = currentPos.lerp(worldPos, 0.1);

      this.player.setPlayerPosition(smoothedPos);
    }
  }
}
