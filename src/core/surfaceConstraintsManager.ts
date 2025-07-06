import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { RayDebuggerManager } from "../utils/rayDebuggerManager";
import * as THREE from "three";

interface SurfaceData {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

interface SurfaceConstraintResult {
  direction: THREE.Vector3;
  speed: number;
  surfaceRotation?: THREE.Quaternion;
}

interface PredictiveCollisionResult {
  willCollide: boolean;
  urgency: number;
}

export interface RaycastingPerformance {
  trueRaycasts: number;
  cacheHits: number;
  averageRaycastTime: number;
  cacheHitRate: number;
}

export class SurfaceConstraintsManager {
  private rayDebugger?: RayDebuggerManager;
  private surfaceDataCache: Map<
    string,
    {
      point: THREE.Vector3;
      normal: THREE.Vector3;
      timestamp: number;
    }
  > = new Map();
  private readonly CACHE_DURATION = 100; // Cache for 10ms to reduce raycasting
  private performanceStats = {
    trueRaycasts: 0,
    cacheHits: 0,
    averageRaycastTime: 0,
  };

  public setRayDebugger(rayDebugger: RayDebuggerManager): void {
    this.rayDebugger = rayDebugger;

    this.rayDebugger.setGroupConfig("moon-surface", {
      color: 0x0099ff,
      scaleFactor: 1,
      maxLength: 100,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.8,
    });

    this.rayDebugger.registerGroupToggle({
      key: "m",
      groupName: "moon-surface",
      description: "Moon surface connection debug visualization",
      defaultEnabled: true,
    });

    this.rayDebugger.setGroupConfig("surface-normal", {
      color: 0xff9900,
      scaleFactor: 1,
      maxLength: 20,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.9,
    });

    this.rayDebugger.registerGroupToggle({
      key: "n",
      groupName: "surface-normal",
      description: "Surface normal debug visualization",
      defaultEnabled: true,
    });
  }

  public findClosestPointOnMoonSurface(
    entity: Entity,
    moon: Moon
  ): SurfaceData | null {
    const entityPos = entity.getPosition();
    const entityId = entity.getId();
    const now = Date.now();

    // Check if we have cached data that's still valid
    const cachedData = this.surfaceDataCache.get(entityId);
    if (cachedData && now - cachedData.timestamp < this.CACHE_DURATION) {
      // Use cached data
      this.performanceStats.cacheHits++;

      const surfaceData = {
        point: cachedData.point,
        normal: cachedData.normal,
      };

      // Update debug rays for cached data too
      this.updateMoonSurfaceDebugRay(entity, surfaceData.point);
      this.updateSurfaceNormalDebugRay(
        entity,
        surfaceData.point,
        surfaceData.normal
      );

      return surfaceData;
    }

    // Perform actual raycasting
    const raycastStart = performance.now();
    const raycastResult = this.performRaycast(entity, moon);
    const raycastTime = performance.now() - raycastStart;

    this.performanceStats.trueRaycasts++;
    this.performanceStats.averageRaycastTime =
      (this.performanceStats.averageRaycastTime *
        (this.performanceStats.trueRaycasts - 1) +
        raycastTime) /
      this.performanceStats.trueRaycasts;

    if (raycastResult) {
      // Cache the result
      this.surfaceDataCache.set(entityId, {
        point: raycastResult.point,
        normal: raycastResult.normal,
        timestamp: now,
      });

      // Update debug rays automatically
      this.updateMoonSurfaceDebugRay(entity, raycastResult.point);
      this.updateSurfaceNormalDebugRay(
        entity,
        raycastResult.point,
        raycastResult.normal
      );

      return raycastResult;
    }

    return null;
  }

  private performRaycast(entity: Entity, moon: Moon): SurfaceData | null {
    const entityPos = entity.getPosition();
    const moonPos = moon.getPosition();

    // Primary raycast for surface point using BVH-accelerated raycasting
    const raycaster = new THREE.Raycaster();
    const direction = moonPos.clone().sub(entityPos).normalize();
    raycaster.set(entityPos, direction);

    // BVH raycasting is automatically used when THREE.Mesh.prototype.raycast is overridden
    const intersects = raycaster.intersectObject(moon.object, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const surfacePoint = intersection.point;

      // Use face normal if available, otherwise geometric normal
      let surfaceNormal: THREE.Vector3;
      if (intersection.face && intersection.face.normal) {
        // Transform face normal to world space
        const worldNormal = intersection.face.normal.clone();
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(
          intersection.object.matrixWorld
        );
        worldNormal.applyMatrix3(normalMatrix).normalize();
        surfaceNormal = worldNormal;
      } else {
        // Fallback to geometric normal
        surfaceNormal = surfacePoint.clone().sub(moonPos).normalize();
      }

      return {
        point: surfacePoint,
        normal: surfaceNormal,
      };
    }

    return null;
  }

  public applySurfaceConstraints(
    entity: Entity,
    moon: Moon,
    surfaceData: SurfaceData,
    direction: THREE.Vector3,
    speed: number,
    minDistance: number = 2.0
  ): SurfaceConstraintResult {
    const { point: surfacePoint, normal: surfaceNormal } = surfaceData;
    const entityPos = entity.getPosition();

    // Calculate distance to surface
    const entityToSurface = surfacePoint.clone().sub(entityPos);
    const distanceToSurface = entityToSurface.length();

    // Use the smoothed surface normal
    const worldNormal = surfaceNormal.clone().normalize();

    // Calculate speed-based minimum distance (faster = need more distance)
    const speedBasedMinDistance = minDistance + speed * 0.1; // Add 0.1 units per speed unit

    // Perform predictive collision detection
    const predictiveResults = this.performPredictiveCollisionCheck(
      entity,
      moon,
      direction,
      speed,
      worldNormal,
      entityPos
    );

    let finalDirection = direction.clone();
    let finalSpeed = speed;

    // Apply predictive braking if collision detected ahead
    if (predictiveResults.willCollide) {
      const brakingFactor = Math.max(0.3, 1.0 - predictiveResults.urgency);
      finalSpeed *= brakingFactor;

      // Apply stronger upward force to avoid collision
      const avoidanceForce = worldNormal
        .clone()
        .multiplyScalar(predictiveResults.urgency * 0.5);
      finalDirection = finalDirection.add(avoidanceForce).normalize();
    }

    if (distanceToSurface < speedBasedMinDistance) {
      // Project movement direction onto surface plane to prevent going through
      const projectedDirection = finalDirection
        .clone()
        .sub(
          worldNormal.clone().multiplyScalar(finalDirection.dot(worldNormal))
        );

      // Preserve speed when projecting onto surface
      if (projectedDirection.length() > 0.01) {
        projectedDirection.normalize();
        finalDirection = projectedDirection;
        // Keep original speed when projecting (already modified by predictive braking)
        finalSpeed = finalSpeed;
      }

      // Add surface push force with speed-based strength
      const speedFactor = Math.min(speed / 20, 2.0); // Scale with speed, cap at 2x
      const pushStrength = Math.pow(
        (speedBasedMinDistance - distanceToSurface) / speedBasedMinDistance,
        2
      );
      const pushForce = worldNormal
        .clone()
        .multiplyScalar(pushStrength * 0.2 * speedFactor);

      // Add push force but maintain speed magnitude
      const combinedDirection = finalDirection.add(pushForce);
      if (combinedDirection.length() > 0.01) {
        finalDirection = combinedDirection.normalize();
        // Apply speed reduction based on how close we are to surface
        const proximityFactor = Math.max(
          0.5,
          distanceToSurface / speedBasedMinDistance
        );
        finalSpeed = Math.max(finalSpeed * proximityFactor, finalSpeed * 0.3);
      }
    } else {
      // When close to surface, project movement to follow surface contour
      if (distanceToSurface < speedBasedMinDistance * 2) {
        const projectedDirection = finalDirection
          .clone()
          .sub(
            worldNormal.clone().multiplyScalar(finalDirection.dot(worldNormal))
          );

        // Calculate slope factor for speed adjustment
        const slopeAngle = Math.acos(
          Math.abs(worldNormal.dot(new THREE.Vector3(0, 1, 0)))
        );
        const slopeFactor = this.calculateSlopeSpeedFactor(
          finalDirection,
          worldNormal,
          slopeAngle
        );

        // Blend between free movement and surface-following
        const blendFactor = Math.pow(
          1 -
            (distanceToSurface - speedBasedMinDistance) / speedBasedMinDistance,
          2
        );

        if (projectedDirection.length() > 0.01) {
          projectedDirection.normalize();
          finalDirection = finalDirection.lerp(
            projectedDirection,
            blendFactor * 0.7
          );
          finalDirection.normalize();

          // Apply slope-based speed modification with speed-sensitive limits
          const speedSensitiveSlopeFactor = this.getSpeedSensitiveSlopeFactor(
            slopeFactor,
            speed
          );
          finalSpeed = finalSpeed * speedSensitiveSlopeFactor;
        } else {
          // If projection is too small, keep original direction but apply slope factor
          const speedSensitiveSlopeFactor = this.getSpeedSensitiveSlopeFactor(
            slopeFactor,
            speed
          );
          finalSpeed = finalSpeed * speedSensitiveSlopeFactor;
        }
      }
    }

    // Calculate surface-aligned rotation with additional smoothing
    const surfaceRotation = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);

    // Blend surface normal with a slight upward bias for stability
    const stabilizedNormal = worldNormal.clone().lerp(up, 0.1).normalize();
    surfaceRotation.setFromUnitVectors(up, stabilizedNormal);

    return {
      direction: finalDirection,
      speed: finalSpeed,
      surfaceRotation,
    };
  }

  private performPredictiveCollisionCheck(
    entity: Entity,
    moon: Moon,
    direction: THREE.Vector3,
    speed: number,
    surfaceNormal: THREE.Vector3,
    currentPos: THREE.Vector3
  ): PredictiveCollisionResult {
    // Calculate how many frames ahead to check based on speed
    const framesToCheck = Math.min(Math.max(Math.floor(speed / 5), 1), 4);

    // Check if we're moving toward the surface
    const velocityTowardSurface = direction.dot(surfaceNormal.clone().negate());

    if (velocityTowardSurface <= 0) {
      // Not moving toward surface, no collision risk
      return { willCollide: false, urgency: 0 };
    }

    // Predict positions for next few frames
    for (let frame = 1; frame <= framesToCheck; frame++) {
      const frameTime = frame / 60.0; // Assuming 60fps
      const predictedPos = currentPos
        .clone()
        .add(direction.clone().multiplyScalar(speed * frameTime));

      // Check distance to surface at predicted position
      const predictedSurfaceData = this.findClosestPointOnMoonSurface(
        {
          getPosition: () => predictedPos,
          getId: () => entity.getId(),
        } as Entity,
        moon
      );

      if (predictedSurfaceData) {
        const predictedDistance =
          predictedSurfaceData.point.distanceTo(predictedPos);
        const requiredDistance = 2.0 + speed * 0.1; // Speed-based minimum distance

        if (predictedDistance < requiredDistance) {
          // Collision detected! Calculate urgency based on how soon and how severe
          const urgency = Math.min(
            1.0,
            (requiredDistance - predictedDistance) / requiredDistance
          );
          const timeUrgency = 1.0 - frame / framesToCheck;

          return {
            willCollide: true,
            urgency: (urgency + timeUrgency) / 2,
          };
        }
      }
    }

    return { willCollide: false, urgency: 0 };
  }

  private getSpeedSensitiveSlopeFactor(
    baseSlopeFactor: number,
    speed: number
  ): number {
    // Reduce downhill speed bonuses when moving very fast to prevent surface penetration
    if (baseSlopeFactor > 1.0 && speed > 15) {
      const speedPenalty = Math.min((speed - 15) / 20, 0.5); // Max 50% penalty
      return baseSlopeFactor - (baseSlopeFactor - 1.0) * speedPenalty;
    }

    return baseSlopeFactor;
  }

  private calculateSlopeSpeedFactor(
    movementDirection: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    slopeAngle: number
  ): number {
    // Calculate if we're going uphill or downhill
    const up = new THREE.Vector3(0, 1, 0);

    // Project movement onto the slope to get the slope direction
    const slopeDirection = movementDirection
      .clone()
      .sub(
        surfaceNormal
          .clone()
          .multiplyScalar(movementDirection.dot(surfaceNormal))
      )
      .normalize();

    // Check if movement is going up or down the slope
    const slopeDotUp = slopeDirection.dot(up);

    // Base speed factor based on slope steepness
    const maxSlopeEffect = 0.4; // Maximum 40% speed change
    const slopeEffect = Math.sin(slopeAngle) * maxSlopeEffect;

    let speedFactor = 1.0;

    if (slopeDotUp > 0.1) {
      // Going uphill - reduce speed
      speedFactor = 1.0 - slopeEffect * 0.7; // Reduce by up to 28%
    } else if (slopeDotUp < -0.1) {
      // Going downhill - increase speed
      speedFactor = 1.0 + slopeEffect * 0.5; // Increase by up to 20%
    }

    // Clamp speed factor to reasonable bounds
    return Math.max(0.4, Math.min(1.6, speedFactor));
  }
  public getPerformanceStats(): RaycastingPerformance {
    return {
      trueRaycasts: this.performanceStats.trueRaycasts,
      cacheHits: this.performanceStats.cacheHits,
      averageRaycastTime: this.performanceStats.averageRaycastTime,
      cacheHitRate:
        this.performanceStats.trueRaycasts > 0
          ? (this.performanceStats.cacheHits /
              (this.performanceStats.trueRaycasts +
                this.performanceStats.cacheHits)) *
            100
          : 0,
    };
  }

  public cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.surfaceDataCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION * 2) {
        this.surfaceDataCache.delete(key);
      }
    }
  }

  public updateMoonSurfaceDebugRay(
    entity: Entity,
    moonSurfacePoint: THREE.Vector3
  ): void {
    if (!this.rayDebugger) return;

    const entityPos = entity.getPosition();
    const entityToSurface = moonSurfacePoint.clone().sub(entityPos);
    const distance = entityToSurface.length();

    this.rayDebugger.setRay("moon-surface", entity.getId(), {
      id: entity.getId(),
      origin: entityPos,
      direction: entityToSurface.clone().normalize(),
      magnitude: distance,
    });
  }

  public updateSurfaceNormalDebugRay(
    entity: Entity,
    surfacePoint: THREE.Vector3,
    surfaceNormal: THREE.Vector3
  ): void {
    if (!this.rayDebugger) return;

    this.rayDebugger.setRay("surface-normal", entity.getId(), {
      id: `${entity.getId()}-normal`,
      origin: surfacePoint,
      direction: surfaceNormal.clone().normalize(),
      magnitude: 5,
    });
  }
}
