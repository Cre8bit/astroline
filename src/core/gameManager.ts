import { Player } from "../entities/player";
import type { TrainHead } from "../entities/trainHead";
import * as THREE from "three";
import { PlayerModeEnum } from "./enums/playerModeEnum";
import type { ControllerManager } from "../controller/controllerManager";
import { PlayerController } from "../controller/playerController";
import { TrainController } from "../controller/trainController";
import type { IntentManager } from "./intentManager";

export class GameManager {
  private readonly playerTrainBindings = new Map<Player, TrainHead>();
  private readonly players: Player[];
  private readonly trains: TrainHead[];
  private readonly controllerManager: ControllerManager;
  private readonly intentManager: IntentManager;

  constructor(
    players: Player[],
    trains: TrainHead[],
    controllerManager: ControllerManager,
    intentManager: IntentManager
  ) {
    this.players = players;
    this.trains = trains;
    this.controllerManager = controllerManager;
    this.intentManager = intentManager;
  }

  public update(delta: number): void {
    this.intentManager.reset();

    // 1. Compute base input intents from controllers
    const inputIntents = this.controllerManager.computeAllIntents();
    this.intentManager.setBaseIntents(inputIntents);

    // 2. Override intents with game logic
    this.processPlayerTrainBindings(delta);

    // 3. Apply physics forces → overrideIntent
    // physicsEngine.applyTo(this.intentManager);

    // 4. Apply final intent to each entity
    const allIntents = this.intentManager.getAllIntents();
    for (const [entity, intent] of allIntents.entries()) {
      entity.applyIntent(intent, delta);
    }

    // 5. Sync player controllers with player positions
    for (const player of this.players) {
      const playerController = this.controllerManager.getController(player);
      if (!(playerController instanceof PlayerController)) continue;

      playerController.syncWithPlayer(player);

    }
  }

  private processPlayerTrainBindings(delta: number) {
    for (const player of this.players) {
      const playerController = this.controllerManager.getController(player);
      if (!(playerController instanceof PlayerController)) continue;

      const isOnTrain = playerController.getMode() === PlayerModeEnum.Train;
      if (!isOnTrain) continue;

      const boundTrain = this.playerTrainBindings.get(player);
      if (!boundTrain) continue;

      const trainController = this.controllerManager.getController(boundTrain);
      if (!(trainController instanceof TrainController)) continue;

      const camForward = new THREE.Vector3();
      playerController.getCamera().getWorldDirection(camForward).normalize();
      trainController.setLookDirection(camForward);
      trainController.setBoost(playerController.isBoosting());

      const riderTarget = boundTrain.getRiderWorldPosition();
      const currentPos = player.getPosition();
      const followPos = currentPos.clone().lerp(riderTarget, 0.1);

      const direction = followPos.clone().sub(currentPos);
      const speed = direction.length() / delta;

      this.intentManager.setOverrideIntent(player, {
        direction: direction.normalize(),
        targetRotation: playerController.getControls().object.quaternion.clone(),
        speed: speed,
      });
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
