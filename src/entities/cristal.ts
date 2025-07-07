import * as THREE from "three";
import { Entity } from "./entity";

export class Cristal extends Entity {
  public ignorePhysics: boolean = true;
  constructor(
    scene: THREE.Scene,
    params: ConstructorParameters<typeof Entity>[1]
  ) {
    super(scene, params);
  }
  public applyIntent(): void {}
}
