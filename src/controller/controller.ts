import type { MovementIntent } from "../core/interfaces/movementIntent";

export abstract class Controller {
  public abstract computeIntent(): MovementIntent;
}
