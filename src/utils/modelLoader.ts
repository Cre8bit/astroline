import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

abstract class ModelLoader {
  protected static cache: Map<string, THREE.Object3D> = new Map();

  static async load(path: string): Promise<THREE.Object3D> {
    throw new Error("load() must be implemented by subclass");
  }

  static async preload(paths: string[]): Promise<void[]> {
    return Promise.all(
      paths.map((path) => (this as any).load(path).then(() => undefined))
    );
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
  static async loadWithBVH(path: string): Promise<THREE.Object3D> {
    const cached = this.getFromCache(path);
    if (cached) {
      return cached;
    }

    const loader = new GLTFLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          // Apply BVH to the original model before caching
          this.applyBVHToModel(gltf.scene);
          this.addToCache(path, gltf.scene);
          console.log(`Model loaded and BVH applied: ${path}`);
          resolve(gltf.scene.clone());
        },
        undefined,
        (error) => {
          reject(
            new Error(error instanceof Error ? error.message : String(error))
          );
        }
      );
    });
  }

  static applyBVHToModel(root: THREE.Object3D): void {
    console.log("Applying BVH to model...");
    let meshCount = 0;

    root.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;

        // Ensure the geometry has an index for BVH
        if (!geometry.index) {
          geometry.setIndex([
            ...Array(geometry.attributes.position.count).keys(),
          ]);
        }

        // Compute BVH for this mesh
        if (geometry.computeBoundsTree) {
          geometry.computeBoundsTree();
          meshCount++;
          console.log(`BVH computed for mesh: ${child.name || "unnamed"}`);
        } else {
          console.warn(
            `BVH not available for mesh: ${child.name || "unnamed"}`
          );
        }
      }
    });

    console.log(`BVH applied to ${meshCount} meshes`);
  }
}
