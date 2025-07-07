import type { Entity } from "../entities/entity";
import type { MovementIntent } from "./interfaces/movementIntent.interface";

export class IntentManager {
  private baseIntents = new Map<Entity, MovementIntent>();
  private overrideIntents = new Map<Entity, MovementIntent>();

  setBaseIntent(entity: Entity, intent: MovementIntent): void {
    this.baseIntents.set(entity, intent);
  }
  getBaseIntent(entity: Entity): MovementIntent | undefined {
    return this.baseIntents.get(entity);
  }
  setBaseIntents(intents: Map<Entity, MovementIntent>) {
    this.baseIntents.clear();
    for (const [entity, intent] of intents.entries()) {
      this.baseIntents.set(entity, intent);
    }
  }
  setOverrideIntent(entity: Entity, override: MovementIntent): void {
    this.overrideIntents.set(entity, override);
  }
  getOverrideIntent(entity: Entity): MovementIntent | undefined {
    return this.overrideIntents.get(entity);
  }
  setOverrideIntents(intents: Map<Entity, MovementIntent>) {
    this.overrideIntents.clear();
    for (const [entity, intent] of intents.entries()) {
      this.overrideIntents.set(entity, intent);
    }
  }
  getIntent(entity: Entity): MovementIntent {
    return this.overrideIntents.get(entity) ?? this.baseIntents.get(entity)!;
  }
  getAllIntents(): Map<Entity, MovementIntent> {
    const result = new Map<Entity, MovementIntent>();
    const entities = new Set<Entity>([
      ...this.baseIntents.keys(),
      ...this.overrideIntents.keys(),
    ]);
    for (const entity of entities) {
      const intent = this.getIntent(entity);
      if (intent) {
        result.set(entity, intent);
      }
    }
    return result;
  }
  reset(): void {
    this.baseIntents.clear();
    this.overrideIntents.clear();
  }
}
