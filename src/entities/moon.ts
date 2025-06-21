import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Entity } from "../core/entity";

export class Moon extends Entity {
  private readonly modelPath: string;
  constructor(path: string = "") {
    super();
    this.modelPath = path;
  }

  loadModel(): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        this.modelPath,
        (gltf) => {
          this.object = gltf.scene;
          this.setScale(1, 1, 1);
          this.setPosition(0, 0, 0);
          resolve(this.object);
        },
        undefined,
        (error) => {
          reject(new Error(error instanceof Error ? error.message : String(error)));
        }
      );
    });
  }

  getObject(): THREE.Object3D | null {
    return this.object;
  }
}
