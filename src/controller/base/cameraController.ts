import type { Entity } from "../../entities/entity";
import * as THREE from "three";
import { PlayerController } from "./playerController";

export abstract class CameraController<
  TCamera extends THREE.Camera,
  TControls extends THREE.Controls<THREE.Event>
> extends PlayerController<TControls> {
  protected readonly camera: TCamera;
  constructor(camera: TCamera, controls: TControls) {
    super(controls);
    this.camera = camera;
  }
  public getCamera(): TCamera {
    return this.camera;
  }
  public syncWithEntity(entity: Entity): void {
    this.controls.object.position.copy(entity.getPosition());
    const playerRotation = entity.getRotation();
    this.controls.object.quaternion.copy(playerRotation);
    this.controls.object.rotation.setFromQuaternion(playerRotation);
  }
}
