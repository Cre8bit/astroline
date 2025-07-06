import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { MovementIntent } from "./interfaces/movementIntent.interface";
import { rayDebugger } from "../services/rayDebugger.service";
import { SurfaceConstraintsManager } from "./surfaceConstraintsManager";
import * as THREE from "three";

export class PhysicsManager {
  private readonly moons: Moon[];
  private previousSpeeds: Map<string, number> = new Map(); // Track previous speeds for momentum
  private surfaceConstraintsManager: SurfaceConstraintsManager;

  constructor(moons: Moon[]) {
    this.moons = moons;
    this.surfaceConstraintsManager = new SurfaceConstraintsManager();
    this.setupRayDebugger();
  }

  private setupRayDebugger(): void {
    const rayDebuggerService = rayDebugger();
    if (!rayDebuggerService) return;

    rayDebuggerService.setGroupConfig("gravity", {
      color: 0xff0000,
      scaleFactor: 10,
      maxLength: 50,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.8,
    });

    rayDebuggerService.registerGroupToggle({
      key: "g",
      groupName: "gravity",
      description: "Gravity debug visualization",
      defaultEnabled: true,
    });

    rayDebuggerService.setGroupConfig("direction", {
      color: 0x00ff00,
      scaleFactor: 10,
      maxLength: 30,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.9,
    });

    rayDebuggerService.registerGroupToggle({
      key: "b",
      groupName: "direction",
      description: "Entity direction debug visualization",
      defaultEnabled: true,
    });
  }

  private updateGravityDebugRay(
    entity: Entity,
    gravityForce: THREE.Vector3
  ): void {
    const rayDebuggerService = rayDebugger();
    if (!rayDebuggerService) return;

    const entityPos = entity.getPosition();

    rayDebuggerService.setRay("gravity", entity.getId(), {
      id: entity.getId(),
      origin: entityPos,
      direction: gravityForce.clone().normalize(),
      magnitude: gravityForce.length(),
    });
  }
  
  private updateDirectionDebugRay(
    entity: Entity,
    direction: THREE.Vector3
  ): void {
    const rayDebuggerService = rayDebugger();
    if (!rayDebuggerService) return;

    const entityPos = entity.getPosition();

    rayDebuggerService.setRay("direction", entity.getId(), {
      id: entity.getId(),
      origin: entityPos,
      direction: direction.clone().normalize(),
      magnitude: direction.length(),
    });
  }

  public getSurfaceConstraintsManager(): SurfaceConstraintsManager {
    return this.surfaceConstraintsManager;
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

    // Update debug visualization
    this.updateGravityDebugRay(entity, gravityForce);

    if (!baseIntent) {
      return {
        direction: gravityForce.clone().normalize(),
        speed: gravityForce.length(),
        targetRotation: gravityQuat,
      };
    }

    // Mix direction: sum input direction and gravity force
    const totalForce = baseIntent.direction
      .clone()
      .multiplyScalar(baseIntent.speed)
      .add(gravityForce);

    let direction = totalForce.clone().normalize();
    let speed = this.calculatePreservedSpeed(
      totalForce.length(),
      baseIntent.speed
    );

    this.updateDirectionDebugRay(entity, direction);

    // Blend rotations (input orientation → gravity orientation)
    let finalQuat = gravityQuat;

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
    let closestMoon: Moon | null = null;
    let minDistanceSq = Infinity;

    const entityPos = entity.getPosition();
    let closestVector = new THREE.Vector3();

    for (const moon of this.moons) {
      const moonPos = moon.getPosition();
      const diff = moonPos.clone().sub(entityPos);
      const distanceSq = diff.lengthSq();

      if (Math.sqrt(distanceSq) < 40) {
        continue;
      }

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestMoon = moon;
        closestVector = diff.clone();
      }
    }

    if (!closestMoon) {
      return {
        gravityForce: new THREE.Vector3(0, 0, 0),
        gravityQuat: new THREE.Quaternion(0, 0, 0, 1),
      };
    }

    const G = 9.8 * 2;
    const massMoon = closestMoon.mass;
    const massEntity = entity.mass;

    const distance = Math.sqrt(minDistanceSq);
    const forceMagnitude = (G * massMoon * massEntity) / (distance * distance);
    const gravityForce = closestVector
      .normalize()
      .multiplyScalar(forceMagnitude);

    // --- Compute orientation: rotate entity Y+ to oppose gravity direction ---
    const up = new THREE.Vector3(0, 1, 0); // world up assumed
    const gravityDir = gravityForce.clone().normalize().negate(); // "up" should face opposite to gravity

    const gravityQuat = new THREE.Quaternion();
    gravityQuat.setFromUnitVectors(up, gravityDir); // rotation from up → gravity direction

    return {
      gravityForce,
      gravityQuat,
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
