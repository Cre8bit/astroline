import * as THREE from "three";

export class Entity {
  public object: THREE.Object3D;

  constructor() {
    this.object = new THREE.Object3D();
  }

  setPosition(x: number, y: number, z: number) {
    if (this.object) {
      this.object.position.set(x, y, z);
    }
  }

  setScale(x: number, y: number, z: number) {
    if (this.object) {
      this.object.scale.set(x, y, z);
    }
  }
}
