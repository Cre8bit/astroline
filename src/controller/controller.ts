import type { MovementIntentEnum } from "./enums/mouvementIntentEnum";

export abstract class Controller {
public abstract computeInputIntent(): MovementIntentEnum;
}