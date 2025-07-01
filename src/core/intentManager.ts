import type { Entity } from "../entities/entity";
import type { MovementIntent } from "./interfaces/movementIntent";

export class IntentManager {
  private baseIntents = new Map<Entity, MovementIntent>();
  private overrideIntents = new Map<Entity, MovementIntent>();

  setBaseIntent(entity: Entity, intent: MovementIntent): void {
    this.baseIntents.set(entity, intent);
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
    for (const [entity, baseIntent] of this.baseIntents.entries()) {
      const finalIntent = this.overrideIntents.get(entity) ?? baseIntent;
      result.set(entity, finalIntent);
    }
    return result;
  }
  reset(): void {
    this.baseIntents.clear();
    this.overrideIntents.clear();
  }
}
