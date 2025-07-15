import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { MovementIntent } from "./interfaces/movementIntent.interface";
import { rayDebugger } from "../services/rayDebugger.service";
import { setupRayDebugger } from "../services/debug-configs/rayDebug.config";
import { SurfaceConstraintsManager } from "./surfaceConstraintsManager";
import * as THREE from "three";

export class PhysicsManager {
  private readonly moons: Moon[];
  private previousSpeeds: Map<string, number> = new Map(); // Track previous speeds for momentum
  private surfaceConstraintsManager: SurfaceConstraintsManager;

  private gravityForceCache = new Map<string, THREE.Vector3>();
  private directionCache = new Map<string, THREE.Vector3>();

  constructor(moons: Moon[]) {
    this.moons = moons;
    this.surfaceConstraintsManager = new SurfaceConstraintsManager();
    this.setupRayDebugger();
  }

  private setupRayDebugger(): void {
    const rayDebuggerService = rayDebugger();
    if (!rayDebuggerService) return;

    // Setup ray debugger configuration
    setupRayDebugger(rayDebuggerService);
  }

  public registerEntityForRayDebugging(entity: Entity): void {
    const rayDebuggerService = rayDebugger();
    if (!rayDebuggerService) return;

    rayDebuggerService.registerRayUpdater(
      "gravity",
      entity.getId(),
      entity,
      (entity: Entity) => {
        const cachedGravityForce = this.gravityForceCache.get(entity.getId());
        if (!cachedGravityForce || cachedGravityForce.length() === 0)
          return null;

        return {
          id: entity.getId(),
          origin: entity.getPosition(),
          direction: cachedGravityForce.clone().normalize(),
          magnitude: cachedGravityForce.length(),
        };
      }
    );

    rayDebuggerService.registerRayUpdater(
      "direction",
      entity.getId(),
      entity,
      (entity: Entity) => {
        const cachedDirection = this.directionCache.get(entity.getId());
        if (!cachedDirection || cachedDirection.length() === 0) return null;

        return {
          id: entity.getId(),
          origin: entity.getPosition(),
          direction: cachedDirection.clone().normalize(),
          magnitude: cachedDirection.length(),
        };
      }
    );
  }

  public getSurfaceConstraintsManager(): SurfaceConstraintsManager {
    return this.surfaceConstraintsManager;
  }

  /**
   * Clear cached debug data for an entity
   */
  public clearEntityCache(entityId: string): void {
    this.gravityForceCache.delete(entityId);
    this.directionCache.delete(entityId);
  }

  /**
   * Clear all cached debug data
   */
  public clearAllCaches(): void {
    this.gravityForceCache.clear();
    this.directionCache.clear();
  }

  public applyPhysicsTo(
    entities: Entity[],
    inputIntents: Map<Entity, MovementIntent>
  ): Map<Entity, MovementIntent> {
    const result = new Map<Entity, MovementIntent>();

    for (const entity of entities) {
      if (entity.ignorePhysics) {
        continue;
      }
      const baseIntent = inputIntents.get(entity);

      if (!baseIntent) {
        const intentResult = this.applyPhysicsToEntity(entity);
        result.set(entity, intentResult);
      } else {
        const intentResult = this.applyPhysicsToEntity(entity, baseIntent);
        result.set(entity, intentResult);
      }
    }

    return result;
  }

  private applyPhysicsToEntity(
    entity: Entity,
    baseIntent?: MovementIntent
  ): MovementIntent {
    const { gravityForce, gravityQuat, closestMoon } =
      this.processMoonAttraction(entity);

    this.gravityForceCache.set(entity.getId(), gravityForce.clone());

    let direction: THREE.Vector3;
    let speed: number;
    let finalQuat = gravityQuat;

    if (!baseIntent) {
      direction = gravityForce.clone().normalize();
      speed = gravityForce.length();
    } else {
      // Mix direction: sum input direction and gravity force
      const totalForce = baseIntent.direction
        .clone()
        .multiplyScalar(baseIntent.speed)
        .add(gravityForce);

      direction = totalForce.clone().normalize();
      speed = this.calculatePreservedSpeed(
        totalForce.length(),
        baseIntent.speed
      );
    }

    // Apply surface constraints if near a moon
    if (closestMoon) {
      const entityPos = entity.getPosition();
      const moonPos = closestMoon.getPosition();
      const distanceToMoon = entityPos.distanceTo(moonPos);

      // Only do surface calculations when reasonably close to moon
      if (distanceToMoon < 100) {
        const surfaceData =
          this.surfaceConstraintsManager.findClosestPointOnMoonSurface(
            entity,
            closestMoon
          );
        if (surfaceData) {
          // Apply surface constraints to movement
          const constraintResult =
            this.surfaceConstraintsManager.applySurfaceConstraints(
              entity,
              closestMoon,
              surfaceData,
              direction,
              speed,
              3.0 // minimum distance from surface
            );

          direction = constraintResult.direction;

          // Apply speed smoothing to prevent sudden drops
          const entityId = entity.getId();
          const previousSpeed = this.previousSpeeds.get(entityId) || speed;

          // Smooth speed changes to maintain momentum
          const maxSpeedChange = previousSpeed * 0.15; // Allow max 15% speed change per frame
          const clampedSpeed = Math.max(
            previousSpeed - maxSpeedChange,
            Math.min(previousSpeed + maxSpeedChange, constraintResult.speed)
          );

          // Ensure minimum speed when moving
          speed = Math.max(clampedSpeed, speed * 0.6);
          this.previousSpeeds.set(entityId, speed);

          // Blend with surface rotation when close to surface
          if (constraintResult.surfaceRotation) {
            const surfaceDistance = surfaceData.point
              .clone()
              .sub(entityPos)
              .length();

            if (surfaceDistance < 4.0) {
              const blendFactor = 1 - Math.min(surfaceDistance / 4.0, 1.0);
              finalQuat = gravityQuat
                .clone()
                .slerp(constraintResult.surfaceRotation, blendFactor);
            }
          }
        }
      }
    }

    // Cache direction for debug ray visualization
    this.directionCache.set(entity.getId(), direction.clone());

    return {
      direction,
      speed,
      targetRotation: finalQuat,
    };
  }

  private processMoonAttraction(entity: Entity): {
    gravityForce: THREE.Vector3;
    gravityQuat: THREE.Quaternion;
    closestMoon?: Moon | null;
  } {
    const G = 9.8;
    const entityPos = entity.getPosition();
    const entityCurrentRotation = entity.getRotation();
    const entityMass = entity.getMass();

    let totalGravityForce = new THREE.Vector3();
    let totalSmoothedQuat = entity.getRotation();

    let closestMoon: Moon | null = null;
    let closestDistance = Infinity;
    let closestVector = new THREE.Vector3();

    for (const moon of this.moons) {
      const moonPos = moon.getPosition();
      const moonMass = moon.getMass();
      const moonScale = moon.getScale().length();
      const diff = moonPos.clone().sub(entityPos);
      const distance = diff.length();

      const attractionRadius = moon.getAttractionRadius();

      if (distance < closestDistance) {
        closestDistance = distance;
        closestMoon = moon;
        closestVector = diff.clone();
      }

      if (!(distance < attractionRadius)) continue;

      const forceMagnitude =
        (G * moonMass * entityMass) / (distance * distance);
      const gravityForce = diff.normalize().multiplyScalar(forceMagnitude);
      totalGravityForce.add(gravityForce);

      const up = new THREE.Vector3(0, 1, 0);
      const inverseGravityDir = gravityForce.clone().negate();

      // Smooth continuous influence that decreases with distance
      const influenceStrength = 1.5;

      // Smooth exponential decay influence factor
      const normalizedDistance = Math.min(distance / attractionRadius, 1.0);
      const influenceFactor = Math.exp(-normalizedDistance * influenceStrength);

      // Smooth interpolation factor (how fast to approach target orientation)
      const lerpFactor = influenceFactor * 0.02; // Adjust this value to control smoothness

      // Create a rotation that aligns the entity's current local up with gravity direction
      const entityLocalUp = up.clone().applyQuaternion(entityCurrentRotation);
      const alignmentRotation = new THREE.Quaternion();
      alignmentRotation.setFromUnitVectors(entityLocalUp, inverseGravityDir);

      // Apply alignment to current rotation to get target
      const targetQuat = entityCurrentRotation.premultiply(alignmentRotation);

      // Smoothly interpolate from current rotation toward target rotation
      totalSmoothedQuat = totalSmoothedQuat.slerp(targetQuat, lerpFactor);
    }

    if (!closestMoon) {
      return {
        gravityForce: new THREE.Vector3(0, 0, 0),
        gravityQuat: new THREE.Quaternion(0, 0, 0, 1),
      };
    }

    return {
      gravityForce: totalGravityForce,
      gravityQuat: totalSmoothedQuat,
      closestMoon,
    };
  }

  private calculatePreservedSpeed(
    forceSpeed: number,
    intentSpeed: number
  ): number {
    if (intentSpeed === 0) return forceSpeed;
    const inputSpeedRatio = intentSpeed / (intentSpeed + forceSpeed);
    const preservedSpeed = intentSpeed * Math.max(0.7, inputSpeedRatio);
    return Math.max(forceSpeed, preservedSpeed);
  }
}
