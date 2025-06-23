import * as THREE from "three";
import { Entity } from "./entity";
import type { MovementIntentEnum } from "../controller/enums/mouvementIntentEnum";

export abstract class MovingEntity<TController> extends Entity {

public controller!: TController;

  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    super(scene, params);
  }

  public abstract computeControllerIntent(): MovementIntentEnum;

}