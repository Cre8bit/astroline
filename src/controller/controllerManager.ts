import type { MovingEntity } from "../core/movingEntity";
import type { Controller } from "./controller";
import type { MovementIntent } from "../core/interfaces/movementIntent";

export class ControllerManager {
  private readonly bindings = new Map<MovingEntity<Controller>, Controller>();

  bind<T extends Controller>(entity: MovingEntity<T>, controller: T) {
    this.bindings.set(entity, controller);
  }
  getController(entity: MovingEntity<Controller>): Controller | undefined {
    return this.bindings.get(entity);
  }
  computeAllIntents(): Map<MovingEntity<Controller>, MovementIntent> {
    const result = new Map();
    for (const [entity, controller] of this.bindings.entries()) {
      result.set(entity, controller.computeIntent());
    }
    return result;
  }
}
