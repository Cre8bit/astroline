import * as THREE from "three";
import {
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast,
} from "three-mesh-bvh";

export function initializeBVH() {
  // Extend BufferGeometry prototype for BVH
  const BufferGeometry = (THREE as any).BufferGeometry;
  if (BufferGeometry && !BufferGeometry.prototype.computeBoundsTree) {
    BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    console.log("✓ BVH methods initialized on BufferGeometry prototype");
  } else if (BufferGeometry && BufferGeometry.prototype.computeBoundsTree) {
    console.log("✓ BVH methods already initialized");
  } else {
    console.warn(
      "⚠ Could not initialize BVH methods - BufferGeometry not found"
    );
  }

  // Override raycast method to use accelerated BVH raycasting
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  console.log("✓ Mesh.raycast now uses accelerated BVH raycast");
}