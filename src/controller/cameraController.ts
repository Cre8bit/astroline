import type { Entity } from "../entities/entity";
import { Controller } from "./controller";
import * as THREE from "three";

export abstract class CameraController<TCamera extends THREE.Camera, TControls extends THREE.Controls<THREE.Event>> extends Controller {
  protected readonly camera: TCamera;
  protected readonly controls: TControls;
  constructor(camera: TCamera, controls: TControls) {
    super();
    this.camera = camera;
    this.controls = controls;
  }
  public getCamera(): TCamera {
    return this.camera;
  }
  public getControls(): TControls {
    return this.controls;
  }
  public syncWithEntity(entity: Entity): void {
    this.controls.object.position.copy(entity.getPosition());
    const playerRotation = entity.getRotation();
    this.controls.object.quaternion.copy(playerRotation);
    this.controls.object.rotation.setFromQuaternion(playerRotation);
  }
}
