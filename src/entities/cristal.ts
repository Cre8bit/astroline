import * as THREE from "three";
import { Entity } from "./entity";

export class Cristal extends Entity {
  public ignorePhysics: boolean = true;
  constructor(
    scene: THREE.Scene,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: THREE.Vector3 | number;
    }
  ) {
    super(scene, params);
    this.name = "Cristal";
  }
  public applyIntent(): void {}
}
