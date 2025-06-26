import type { Entity } from "../entities/entity";
import type { Moon } from "../entities/moon";
import type { MovementIntent } from "./interfaces/movementIntent";
import * as THREE from "three";

export class PhysicsSimulator {
  private readonly moons: Moon[];

  constructor(moons: Moon[]) {
    this.moons = moons;
  }

  applyPhysicsToEntity(entity: Entity, intent: MovementIntent): MovementIntent {
    let updatedIntent = { ...intent };

    moonAttractionForce = this.processMoonAttraction(entity);

    updatedIntent = this.applySurfaceFollow(entity, updatedIntent);

    return updatedIntent;
  }

   private processMoonAttraction(entity: Entity): THREE.Vector3 {
    const entityPos = entity.getObjectPosition();

    // Find the closest moon
    let closestMoon: Moon | null = null;
    let minDistance = Infinity;

    for (const moon of this.moons) {
      const moonCenter = moon.getCenter();
      const distance = moonCenter.distanceToSquared(entityPos);
      if (distance < minDistance) {
        minDistance = distance;
        closestMoon = moon;
      }
    }

    // If no moon, no gravity
    if (!closestMoon) return new THREE.Vector3();

    // Compute gravity direction
    const moonCenter = closestMoon.getCenter();
    const gravityDir = moonCenter.clone().sub(entityPos).normalize();

    // Optional: Apply strength factor
    const strength = 1.0; // You can tune this
    return gravityDir.multiplyScalar(strength);
  }
}

  private applySurfaceFollow(
    entity: Entity,
    intent: MovementIntent
  ): MovementIntent {

    const raycaster = new THREE.Raycaster(
      entity.object.position,
      new THREE.Vector3()
        .subVectors(this.moons[0].object.position, entity.object.position)
        .normalize()
    );

    const intersects = raycaster.intersectObject(this.moons[0].object, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const surfacePoint = hit.point;
      const surfaceNormal = hit.face?.normal
        ?.clone()
        .applyMatrix3(
          new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)
        )
        .normalize();

      if (surfaceNormal) {
        const projectedDir = intent.direction
          .clone()
          .projectOnPlane(surfaceNormal)
          .normalize();

        return {
          ...intent,
          direction: projectedDir,
        };
      }
    }

    return intent;
  }
}
