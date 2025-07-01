import * as THREE from "three";
import { Entity } from "./entity";

export class Moon extends Entity {
  public name: string = "Moon";
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
    this.mass = 100;
  }
  public applyIntent(): void {}
}
