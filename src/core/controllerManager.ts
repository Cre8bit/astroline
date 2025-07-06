import type { Controller } from "../controller/base/controller";
import type { MovementIntent } from "./interfaces/movementIntent.interface";
import type { Entity } from "../entities/entity";

export class ControllerManager {
  private readonly bindings = new Map<Entity, Controller>();

  bind<T extends Controller>(entity: Entity, controller: T) {
    this.bindings.set(entity, controller);
  }
  getController(entity: Entity): Controller | undefined {
    return this.bindings.get(entity);
  }
  computeAllIntents(): Map<Entity, MovementIntent> {
    const result = new Map();
    for (const [entity, controller] of this.bindings.entries()) {
      result.set(entity, controller.computeIntent());
    }
    return result;
  }
  syncControllersWithEntities() {
    for (const [entity, controller] of this.bindings.entries()) {
      controller.syncWithEntity(entity);
    }
  }
}
