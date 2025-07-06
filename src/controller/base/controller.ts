import type { MovementIntent } from "../../core/interfaces/movementIntent.interface";
import type { Entity } from "../../entities/entity";

export abstract class Controller {
  public abstract computeIntent(): MovementIntent;

  public abstract syncWithEntity(entity: Entity): void;
}
