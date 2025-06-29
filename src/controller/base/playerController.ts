import { PlayerModeEnum } from "../../core/enums/playerMode.enum";
import { Controller } from "./controller";
import * as THREE from "three";

export abstract class PlayerController<
  TControls extends THREE.Controls<THREE.Event>
> extends Controller {
  protected mode: PlayerModeEnum = PlayerModeEnum.FreeCam;
  protected readonly controls: TControls;
  constructor(controls: TControls) {
    super();
    this.controls = controls;
  }
  protected toggleMode() {
    this.mode =
      this.mode === PlayerModeEnum.Train
        ? PlayerModeEnum.FreeCam
        : PlayerModeEnum.Train;
    console.log(`Switched mode to ${this.mode}`);
  }
  public getMode(): PlayerModeEnum {
    return this.mode;
  }
  public getControls(): TControls {
    return this.controls;
  }
  public abstract isBoosting(): boolean;
  public abstract getForwardDirection(): THREE.Vector3;
}
