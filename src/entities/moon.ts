import * as THREE from "three";
import { Entity } from "./entity";

export class Moon extends Entity {
  public ignorePhysics: boolean = true;
  private attractionRadius: number;
  constructor(
    scene: THREE.Scene,
    params: ConstructorParameters<typeof Entity>[1]
  ) {
    super(scene, params);
    this.attractionRadius = this.processAttractionRadius(
      this.getScale().length(),
      this.getMass()
    );

    console.log(
      `Moon ${this.getName()} initialized with attraction radius: ${
        this.attractionRadius
      }`
    );
  }
  public applyIntent(): void {}

  getAttractionRadius(): number {
    return this.attractionRadius;
  }
  private processAttractionRadius(moonScale: number, moonMass: number): number {
    const baseRadius = 60;
    const massInfluence = Math.log10(moonMass + 1);
    const scaleInfluence = Math.log2(moonScale + 1);

    const influenceFactor = 1 + massInfluence * scaleInfluence;

    const radius = baseRadius * influenceFactor;

    return Math.max(radius, 100);
  }
}
