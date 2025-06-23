import type { MovementIntentEnum } from "../controller/enums/mouvementIntentEnum";
import { TrainController } from "../controller/trainController";
import { MovingEntity } from "../core/movingEntity";
import type { Player } from "./player";
import * as THREE from "three";

export class TrainHead extends MovingEntity<TrainController> {
  private readonly player: Player;
  public controller: TrainController;
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
    this.controller = new TrainController(this.player);
  }
  public computeControllerIntent(): MovementIntentEnum {
    return this.controller.computeInputIntent();
  }

  public applyIntent(intent: MovementIntentEnum, delta: number): void {
    const displacement = intent.direction
      .clone()
      .multiplyScalar(intent.speed * delta);
    this.object.position.add(displacement);
    this.object.quaternion.slerp(intent.targetRotation, 0.1);

     if (this.player.isOnTrain()) {
      const localOffset = new THREE.Vector3(0, 1.8, 0);
      const worldPos = localOffset.applyMatrix4(this.object.matrixWorld);

      const currentPos = this.player.getPlayerPosition();
      const smoothedPos = currentPos.lerp(worldPos, 0.1);

      this.player.setPlayerPosition(smoothedPos);
    }
  }
}
