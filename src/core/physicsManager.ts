import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { MovementIntent } from "./interfaces/movementIntent";
import type { RayDebuggerManager } from "./rayDebuggerManager";
import * as THREE from "three";

export class PhysicsManager {
  private readonly moons: Moon[];
  private rayDebugger?: RayDebuggerManager;

  constructor(moons: Moon[]) {
    this.moons = moons;
  }

  public setRayDebugger(rayDebugger: RayDebuggerManager): void {
    this.rayDebugger = rayDebugger;

    this.rayDebugger.setGroupConfig("gravity", {
      color: 0xff0000,
      scaleFactor: 10,
      maxLength: 50,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.8,
    });

    this.rayDebugger.registerGroupToggle({
      key: "g",
      groupName: "gravity",
      description: "Gravity debug visualization",
      defaultEnabled: true,
    });

    this.rayDebugger.setGroupConfig("direction", {
      color: 0x00ff00,
      scaleFactor: 10,
      maxLength: 30,
      headLength: undefined,
      headWidth: undefined,
      opacity: 0.9,
    });

    this.rayDebugger.registerGroupToggle({
      key: "h",
      groupName: "direction",
      description: "Entity direction debug visualization",
      defaultEnabled: true,
    });
  }

  private updateGravityDebugRay(
    entity: Entity,
    gravityForce: THREE.Vector3
  ): void {
    if (!this.rayDebugger) return;

    const entityPos = entity.getPosition();

    this.rayDebugger.setRay("gravity", entity.getId(), {
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
    if (!this.rayDebugger) return;
    const entityPos = entity.getPosition();
    this.rayDebugger.setRay("direction", entity.getId(), {
      id: entity.getId(),
      origin: entityPos,
      direction: direction.clone().normalize(),
      magnitude: direction.length(),
    });
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
    const { gravityForce, targetRotation: gravityQuat } =
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

    const direction = totalForce.clone().normalize();
    const speed = totalForce.length();

    this.updateDirectionDebugRay(entity, direction);

    // Blend rotations (input orientation → gravity orientation)
    const finalQuat =gravityQuat;
    return {
      direction,
      speed,
      targetRotation: finalQuat,
    };
  }

  private processMoonAttraction(entity: Entity): {
    gravityForce: THREE.Vector3;
    targetRotation: THREE.Quaternion;
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
      // No moons found,
      return {
        gravityForce: new THREE.Vector3(),
        targetRotation: new THREE.Quaternion(),
      };
    }

    // Apply gravity physics (simplified Newtonian gravity)
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

    const targetQuat = new THREE.Quaternion();
    targetQuat.setFromUnitVectors(up, gravityDir); // rotation from up → gravity direction

    return {
      gravityForce,
      targetRotation: targetQuat,
    };
  }
}
