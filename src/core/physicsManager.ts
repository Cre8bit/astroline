import { Moon } from "../entities/moon";
import type { Entity } from "./entity";
import * as THREE from "three";
export class PhysicsManager {
  private entities: Set<Entity> = new Set();

  addEntity(entity: Entity) {
    this.entities.add(entity);
  }

  removeEntity(entity: Entity) {
    this.entities.delete(entity);
  }

  update(delta: number) {
  const G = 100;
  const moon = [...this.entities].find(e => e instanceof Moon);

  if (!moon) return;

  const moonPos = moon.object.position;

  this.entities.forEach(entity => {
    if (entity.isStatic) return;

    // Calculate direction to moon
    const dir = new THREE.Vector3().subVectors(moonPos, entity.object.position);
    const distanceSq = dir.lengthSq();
    dir.normalize();

    // Apply Newtonian gravity: F = G * m1 * m2 / r²
    const force = dir.multiplyScalar((G * entity.mass * moon.mass) / distanceSq);

    // Apply acceleration: a = F / m
    const acceleration = force.divideScalar(entity.mass);

    // Update velocity
    entity.velocity.add(acceleration.multiplyScalar(delta));

    // Update position
    entity.object.position.add(entity.velocity.clone().multiplyScalar(delta));
  });
}
}