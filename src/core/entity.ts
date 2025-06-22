import * as THREE from "three";

export class Entity {
  public object: THREE.Object3D;
  protected scene: THREE.Scene;
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    this.object = params.object ?? new THREE.Object3D();
    this.scene = scene;

    if (params.position) {
      if (params.position instanceof THREE.Vector3) {
        this.setPosition(params.position);
      } else {
        this.setPosition(
          new THREE.Vector3(params.position[0], params.position[1], params.position[2])
        );
      }
    } else {
      this.setPosition(new THREE.Vector3(0, 0, 0));
    }

    if (params.scale !== undefined) {
      if (params.scale instanceof THREE.Vector3) {
        this.setScale(params.scale);
      } else {
        this.setScale(new THREE.Vector3(params.scale, params.scale, params.scale));
      }
    } else {
      this.setScale(new THREE.Vector3(1, 1, 1));
    }

    this.scene.add(this.object);
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
      } else {
        this.object.position.set(arg1, arg2!, arg3!);
      }
    }
  }

  setScale(scale: THREE.Vector3): void;
  setScale(x: number, y: number, z: number): void;
  setScale(arg1: THREE.Vector3 | number, arg2?: number, arg3?: number): void {
    if (this.object) {
      if (arg1 instanceof THREE.Vector3) {
        this.object.scale.copy(arg1);
      } else {
        this.object.scale.set(arg1, arg2!, arg3!);
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.object);
  }
}
