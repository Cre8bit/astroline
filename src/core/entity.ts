import * as THREE from "three";
import type { MovementIntentEnum } from "../controller/enums/mouvementIntentEnum";

export abstract class Entity {
  public object: THREE.Object3D;
  protected scene: THREE.Scene;
  public velocity = new THREE.Vector3();
  public mass: number = 1;
  public isStatic: boolean = false;
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    this.object = params.object ?? new THREE.Object3D();
    this.scene = scene;

    this.scene.add(this.object);
  }

  setupObject(
    position: THREE.Vector3 | [number, number, number] = new THREE.Vector3(
      0,
      0,
      0
    ),
    rotation: THREE.Euler | [number, number, number] = new THREE.Euler(0, 0, 0),
    scale: THREE.Vector3 | number = new THREE.Vector3(1, 1, 1)
  ): void {
    if (position) {
      if (position instanceof THREE.Vector3) {
        this.setPosition(position);
      } else {
        this.setPosition(
          new THREE.Vector3(position[0], position[1], position[2])
        );
      }
    } else {
      this.setPosition(new THREE.Vector3(0, 0, 0));
    }

    if (rotation) {
      if (rotation instanceof THREE.Euler) {
        this.setRotation(rotation);
      } else {
        this.setRotation(
          new THREE.Euler(rotation[0], rotation[1], rotation[2])
        );
      }
    } else {
      this.setRotation(new THREE.Euler(0, 0, 0));
    }

    if (scale !== undefined) {
      if (scale instanceof THREE.Vector3) {
        this.setScale(scale);
      } else {
        this.setScale(new THREE.Vector3(scale, scale, scale));
      }
    } else {
      this.setScale(new THREE.Vector3(1, 1, 1));
    }
  }
  setPosition(position: THREE.Vector3): void;
  setPosition(x: number, y: number, z: number): void;
  setPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (this.object) {
      if (arg1 instanceof THREE.Vector3) {
        this.object.position.copy(arg1);
      } else if (
        typeof arg1 === "number" &&
        typeof arg2 === "number" &&
        typeof arg3 === "number"
      ) {
        this.object.position.set(arg1, arg2, arg3);
      }
    }
  }

  setRotation(rotation: THREE.Euler): void;
  setRotation(x: number, y: number, z: number): void;
  setRotation(arg1: THREE.Euler | number, arg2?: number, arg3?: number): void {
    if (this.object) {
      if (arg1 instanceof THREE.Euler) {
        this.object.rotation.copy(arg1);
      } else if (
        typeof arg1 === "number" &&
        typeof arg2 === "number" &&
        typeof arg3 === "number"
      ) {
        this.object.rotation.set(arg1, arg2, arg3);
      }
    }
  }
  setScale(scale: THREE.Vector3): void;
  setScale(x: number, y: number, z: number): void;
  setScale(arg1: THREE.Vector3 | number, arg2?: number, arg3?: number): void {
    if (this.object) {
      if (arg1 instanceof THREE.Vector3) {
        this.object.scale.copy(arg1);
      } else if (
        typeof arg1 === "number" &&
        typeof arg2 === "number" &&
        typeof arg3 === "number"
      ) {
        this.object.scale.set(arg1, arg2, arg3);
      }
    }
  }
  public abstract applyIntent(intent: MovementIntentEnum, delta: number): void;
  dispose(): void {
    this.scene.remove(this.object);
  }
}
