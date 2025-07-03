import { Player } from "../entities/player";
import { TrainHead } from "../entities/trainHead";
import * as THREE from "three";
import { PlayerModeEnum } from "./enums/playerMode.enum";
import type { ControllerManager } from "./controllerManager";
import { TrainController } from "../controller/trainController";
import { IntentManager } from "./intentManager";
import { PlayerController } from "../controller/base/playerController";
import { PhysicsManager } from "./physicsManager";
import { Entity } from "../entities/entity";
import { Moon } from "../entities/moon";
import { RayDebuggerManager } from "./rayDebuggerManager";

export class GameManager {
  private readonly entities: Entity[];
  private readonly playerTrainBindings = new Map<Player, TrainHead>();
  private readonly players: Player[];
  private readonly trains: TrainHead[];
  private readonly moons: Moon[] = [];
  private readonly controllerManager: ControllerManager;
  private readonly intentManager: IntentManager;
  private readonly physicsManager: PhysicsManager;
  private readonly rayDebugger: RayDebuggerManager;

  constructor(
    entities: Entity[],
    controllerManager: ControllerManager,
    scene: THREE.Scene
  ) {
    this.entities = entities;

    this.players = entities.filter((e) => e instanceof Player) as Player[];
    this.trains = entities.filter((e) => e instanceof TrainHead) as TrainHead[];
    this.moons = entities.filter((e) => e instanceof Moon) as Moon[];

    this.controllerManager = controllerManager;
    this.intentManager = new IntentManager();
    this.physicsManager = new PhysicsManager(this.moons);

    this.rayDebugger = new RayDebuggerManager();
    this.rayDebugger.setScene(scene);
    this.rayDebugger.enable(true);

    this.physicsManager.setRayDebugger(this.rayDebugger);

    // Sync controllers with entities positions and rotations
    this.controllerManager.syncControllersWithEntities();
  }

  public update(delta: number): void {
    this.intentManager.reset();

    // 1. Compute base input intents from controllers
    const inputIntents = this.controllerManager.computeAllIntents();
    this.intentManager.setBaseIntents(inputIntents);

    // 2. Apply physics forces → overrideIntent
    const resultIntents = this.physicsManager.applyPhysicsTo(
      this.entities,
      inputIntents
    );
    this.intentManager.setOverrideIntents(resultIntents);

    // 3. Override intents with game logic
    this.processPlayerTrainBindings(delta);

    // 4. Apply final intent to each entity
    const allIntents = this.intentManager.getAllIntents();
    for (const [entity, intent] of allIntents.entries()) {
      entity.applyIntent(intent, delta);
    }

    // 5. Sync entities controllers
    this.controllerManager.syncControllersWithEntities();
  }

  public enablePhysicsDebug(enabled: boolean = true): void {
    this.rayDebugger.enable(enabled);
  }

  public getRayDebugger(): RayDebuggerManager {
    return this.rayDebugger;
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

      const camForward = playerController.getForwardDirection();
      trainController.setLookDirection(camForward);
      trainController.setBoost(playerController.isBoosting());

      const riderTarget = boundTrain.getRiderWorldPosition();
      const currentPos = player.getPosition();
      const followPos = currentPos.clone().lerp(riderTarget, 0.1);

      const direction = followPos.clone().sub(currentPos);
      const speed = direction.length() / delta;

      this.intentManager.setOverrideIntent(player, {
        direction: direction.normalize(),
        targetRotation: playerController
          .getControls()
          .object.quaternion.clone(),
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
