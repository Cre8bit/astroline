import * as THREE from "three";

export interface RaycastResult {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  object: THREE.Object3D;
}

export interface RaycastingPerformance {
  frameRaycasts: number;
  frameAverageTime: number;
}

export class RaycastingService {
  private static instance: RaycastingService | null = null;

  private performanceStats = {
    frameRaycasts: 0,
    frameAverageTime: 0,
  };

  private constructor() {}

  public static getInstance(): RaycastingService {
    if (!RaycastingService.instance) {
      RaycastingService.instance = new RaycastingService();
    }
    return RaycastingService.instance;
  }

  /**
   * Performs a raycast from origin in direction against target objects
   * @param origin Starting position of the ray
   * @param direction Direction vector (will be normalized)
   * @param targets Array of objects to raycast against
   * @param maxDistance Maximum distance to check (optional)
   * @returns First intersection result or null if no intersection
   */
  public raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    targets: THREE.Object3D[],
    maxDistance?: number
  ): RaycastResult | null {
    // Perform raycast and track performance
    const raycastStart = performance.now();
    const result = this.performRaycast(origin, direction, targets, maxDistance);
    const raycastTime = performance.now() - raycastStart;

    // Update performance stats for current frame
    this.performanceStats.frameRaycasts++;
    this.performanceStats.frameAverageTime =
      (this.performanceStats.frameAverageTime *
        (this.performanceStats.frameRaycasts - 1) +
        raycastTime) /
      this.performanceStats.frameRaycasts;

    return result;
  }

  /**
   * Performs a raycast from origin towards target position
   * @param origin Starting position
   * @param target Target position to raycast towards
   * @param obstacles Array of objects to raycast against
   * @returns First intersection result or null if no intersection
   */
  public raycastTowards(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    obstacles: THREE.Object3D[]
  ): RaycastResult | null {
    const direction = target.clone().sub(origin).normalize();
    const maxDistance = origin.distanceTo(target);
    return this.raycast(origin, direction, obstacles, maxDistance);
  }

  private performRaycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    targets: THREE.Object3D[],
    maxDistance?: number
  ): RaycastResult | null {
    const raycaster = new THREE.Raycaster();
    const normalizedDirection = direction.clone().normalize();
    raycaster.set(origin, normalizedDirection);

    if (maxDistance !== undefined) {
      raycaster.far = maxDistance;
    }

    // Collect all intersections from all targets
    const allIntersections: THREE.Intersection[] = [];

    for (const target of targets) {
      const intersections = raycaster.intersectObject(target, true);
      allIntersections.push(...intersections);
    }

    if (allIntersections.length === 0) {
      return null;
    }

    // Sort by distance and take the closest
    allIntersections.sort((a, b) => a.distance - b.distance);
    const closest = allIntersections[0];

    // Calculate proper surface normal
    let surfaceNormal: THREE.Vector3;
    if (closest.face && closest.face.normal) {
      // Transform face normal to world space
      const worldNormal = closest.face.normal.clone();
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        closest.object.matrixWorld
      );
      worldNormal.applyMatrix3(normalMatrix).normalize();
      surfaceNormal = worldNormal;
    } else {
      // Fallback to geometric normal (point away from center)
      surfaceNormal = closest.point.clone().sub(origin).normalize();
    }

    return {
      point: closest.point,
      normal: surfaceNormal,
      distance: closest.distance,
      object: closest.object,
    };
  }

  public getFramePerformanceStats(): RaycastingPerformance {
    const stats: RaycastingPerformance = {
      frameRaycasts: this.performanceStats.frameRaycasts,
      frameAverageTime: this.performanceStats.frameAverageTime,
    };
    this.resetPerformanceStats();  
    return stats;
  }

  private resetPerformanceStats(): void {
    this.performanceStats = {
      frameRaycasts: 0,
      frameAverageTime: 0,
    };
  }
}

export const raycastingService = () => RaycastingService.getInstance();
