import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

abstract class ModelLoader {
  protected static cache: Map<string, THREE.Object3D> = new Map();

  static async load(path: string): Promise<THREE.Object3D> {
    throw new Error("load() must be implemented by subclass");
  }

  static async preload(paths: string[]): Promise<void[]> {
    return Promise.all(paths.map(path =>
      (this as any).load(path).then(() => undefined)
    ));
  }

  protected static getFromCache(path: string): THREE.Object3D | null {
    if (this.cache.has(path)) {
      return this.cache.get(path)!.clone();
    }
    return null;
  }

  protected static addToCache(path: string, model: THREE.Object3D): void {
    this.cache.set(path, model);
  }
}

export class GLBModelLoader extends ModelLoader {
  static async load(path: string): Promise<THREE.Object3D> {
    const cached = this.getFromCache(path);
    if (cached) {
      return cached;
    }

    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
    loader.load(
      path,
      (gltf) => {
        this.addToCache(path, gltf.scene);
        console.log(`Model loaded from ${path}`);
        resolve(gltf.scene.clone());
      },
      undefined,
      (error) => {
        reject(new Error(error instanceof Error ? error.message : String(error)));
      }
    );
    });
  }
}