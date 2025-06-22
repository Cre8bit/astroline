import * as THREE from "three";
import { Entity } from "../core/entity";

export class Cristal extends Entity {
  constructor(
    scene: THREE.Scene,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      scale?: THREE.Vector3 | number;
    }
  ) {
    super(scene, params);
  }
}
