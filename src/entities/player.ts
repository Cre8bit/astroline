import * as THREE from "three";
import { Entity } from "./entity";

export class Player extends Entity {
  public ignorePhysics: boolean = true;
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | THREE.Quaternion | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    super(scene, params);
    this.name = "Player";
  }
}
