import * as THREE from "three";
import type { MovementIntent } from "../core/interfaces/movementIntent.interface";

export abstract class Entity {
  protected name: string = "Entity";
  private id: string = crypto.randomUUID();
  public position: THREE.Vector3;
  public rotation: THREE.Quaternion;
  public object: THREE.Object3D;
  protected scene: THREE.Scene;
  public mass: number = 1;
  public ignorePhysics: boolean = false;
  public localObjectPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public localObjectRotation: THREE.Quaternion = new THREE.Quaternion();
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | THREE.Quaternion | [number, number, number];
      scale?: THREE.Vector3 | number;
      localObjectPosition?: THREE.Vector3 | [number, number, number];
      localObjectRotation?:
        | THREE.Euler
        | THREE.Quaternion
        | [number, number, number];
    } = {}
  ) {
    this.object = params.object ?? new THREE.Object3D();
    this.scene = scene;

    // Initialize entity position and rotation (source of truth)
    this.position =
      params.position instanceof THREE.Vector3
        ? params.position.clone()
        : new THREE.Vector3(...(params.position ?? [0, 0, 0]));

    // Initialize rotation as quaternion
    this.rotation = new THREE.Quaternion();
    if (params.rotation instanceof THREE.Quaternion) {
      this.rotation.copy(params.rotation);
    } else if (params.rotation instanceof THREE.Euler) {
      this.rotation.setFromEuler(params.rotation);
    } else if (Array.isArray(params.rotation)) {
      this.rotation.setFromEuler(new THREE.Euler(...params.rotation));
    }

    // Initialize local offsets
    if (params.localObjectPosition) {
      this.localObjectPosition =
        params.localObjectPosition instanceof THREE.Vector3
          ? params.localObjectPosition.clone()
          : new THREE.Vector3(...params.localObjectPosition);
    }

    // Initialize local rotation as quaternion
    if (params.localObjectRotation) {
      if (params.localObjectRotation instanceof THREE.Quaternion) {
        this.localObjectRotation.copy(params.localObjectRotation);
      } else if (params.localObjectRotation instanceof THREE.Euler) {
        this.localObjectRotation.setFromEuler(params.localObjectRotation);
      } else if (Array.isArray(params.localObjectRotation)) {
        this.localObjectRotation.setFromEuler(
          new THREE.Euler(...params.localObjectRotation)
        );
      }
    }

    // Initialize object scale
    if (params.scale) {
      if (params.scale instanceof THREE.Vector3) {
        this.setObjectScale(params.scale);
      } else {
        this.setObjectScale(
          new THREE.Vector3(params.scale, params.scale, params.scale)
        );
      }
    } else {
      this.setObjectScale(new THREE.Vector3(1, 1, 1));
    }
    // Update object transform based on entity position + local offset
    this.updateObjectTransform();

    this.scene.add(this.object);
  }

  /**
   * Updates the object's transform based on entity position/rotation + local offsets
   */
  updateObjectTransform(): void {
    if (!this.object) return;

    // Create transformation matrix for entity position and rotation
    const entityMatrix = new THREE.Matrix4();
    entityMatrix.makeRotationFromQuaternion(this.rotation);
    entityMatrix.setPosition(this.position);

    // Create local transformation matrix
    const localMatrix = new THREE.Matrix4();
    localMatrix.makeRotationFromQuaternion(this.localObjectRotation);
    localMatrix.setPosition(this.localObjectPosition);

    // Combine transformations: entity transform * local transform
    const finalMatrix = new THREE.Matrix4();
    finalMatrix.multiplyMatrices(entityMatrix, localMatrix);

    // Apply final transformation to object
    finalMatrix.decompose(
      this.object.position,
      this.object.quaternion,
      this.object.scale
    );
    this.object.rotation.setFromQuaternion(this.object.quaternion);
  }
  setPosition(position: THREE.Vector3): void;
  setPosition(x: number, y: number, z: number): void;
  setPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      this.position.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.position.set(arg1, arg2, arg3);
    }
    this.updateObjectTransform();
  }
  addToPosition(offset: THREE.Vector3): void;
  addToPosition(dx: number, dy: number, dz: number): void;
  addToPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      this.position.add(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.position.add(new THREE.Vector3(arg1, arg2, arg3));
    }
    this.updateObjectTransform();
  }
  setRotation(rotation: THREE.Euler): void;
  setRotation(rotation: THREE.Quaternion): void;
  setRotation(x: number, y: number, z: number): void;
  setRotation(
    arg1: THREE.Euler | THREE.Quaternion | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Euler) {
      this.rotation.setFromEuler(arg1);
    } else if (arg1 instanceof THREE.Quaternion) {
      this.rotation.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.rotation.setFromEuler(new THREE.Euler(arg1, arg2, arg3));
    }
    this.updateObjectTransform();
  }

  setlocalObjectPosition(position: THREE.Vector3): void;
  setlocalObjectPosition(x: number, y: number, z: number): void;
  setlocalObjectPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      this.localObjectPosition.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.localObjectPosition.set(arg1, arg2, arg3);
    }
    this.updateObjectTransform();
  }

  setlocalObjectRotation(rotation: THREE.Euler): void;
  setlocalObjectRotation(rotation: THREE.Quaternion): void;
  setlocalObjectRotation(x: number, y: number, z: number): void;
  setlocalObjectRotation(
    arg1: THREE.Euler | THREE.Quaternion | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Euler) {
      this.localObjectRotation.setFromEuler(arg1);
    } else if (arg1 instanceof THREE.Quaternion) {
      this.localObjectRotation.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.localObjectRotation.setFromEuler(new THREE.Euler(arg1, arg2, arg3));
    }
    this.updateObjectTransform();
  }
  setObjectScale(scale: THREE.Vector3): void;
  setObjectScale(x: number, y: number, z: number): void;
  setObjectScale(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
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
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getRotation(): THREE.Quaternion {
    return this.rotation.clone();
  }

  setRotationEuler(x: number, y: number, z: number): void {
    this.rotation.setFromEuler(new THREE.Euler(x, y, z));
    this.updateObjectTransform();
  }

  getRotationEuler(): THREE.Euler {
    return new THREE.Euler().setFromQuaternion(this.rotation);
  }

  public applyIntent(intent: MovementIntent, delta: number): void {
    const displacement = intent.direction
      .clone()
      .multiplyScalar(intent.speed * delta);
    this.addToPosition(displacement);

    this.setRotation(intent.targetRotation);

    this.updateObjectTransform();
  }
  dispose(): void {
    this.scene.remove(this.object);
  }
  getId(): string {
    return this.id;
  }
  getName(): string {
    return this.name;
  }
}
