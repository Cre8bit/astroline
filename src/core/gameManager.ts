import type { Player } from "../entities/player";
import type { TrainHead } from "../entities/trainHead";
import * as THREE from "three";
import { PlayerModeEnum } from "./enums/playerModeEnum";
import type { ControllerManager } from "../controller/controllerManager";
import { PlayerController } from "../controller/playerController";
import { TrainController } from "../controller/trainController";

export class GameManager {
  private readonly playerTrainBindings = new Map<Player, TrainHead>();
  private readonly players: Player[];
  private readonly trains: TrainHead[];
  private readonly controllerManager: ControllerManager;

  constructor(
    players: Player[],
    trains: TrainHead[],
    controllerManager: ControllerManager
  ) {
    this.players = players;
    this.trains = trains;
    this.controllerManager = controllerManager;
  }

  update() {
    for (const player of this.players) {
      const playerController = this.controllerManager.getController(player);

      if (playerController && playerController instanceof PlayerController) {
        if (playerController.getMode() === PlayerModeEnum.Train) {
          const boundTrain = this.playerTrainBindings.get(player);

          if (boundTrain) {
            const trainController =
              this.controllerManager.getController(boundTrain);

            const targetPos = boundTrain.getRiderWorldPosition();
            const currentPos = player.getPlayerPosition();
            const smoothedPos = currentPos.lerp(targetPos, 0.1);
            player.setPosition(smoothedPos);

            if (trainController && trainController instanceof TrainController) {
              const camForward = new THREE.Vector3();
              player.camera.getWorldDirection(camForward).normalize();

              trainController.setLookDirection(camForward);
              trainController.setBoost(playerController.isBoosting());
            }
          }
        }
      }
    }
  }

  bindPlayerToTrain(player: Player, train: TrainHead) {
    this.playerTrainBindings.set(player, train);
    console.log(`Player bound to train`);
  }

  unbindPlayerFromTrain(player: Player) {
    this.playerTrainBindings.delete(player);
    console.log(`Player unbound from train`);
  }
}
