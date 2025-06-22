import { Entity } from "../core/entity";
import type { Player } from "./player";
import * as THREE from "three";

export class TrainHead extends Entity {
  private readonly player: Player;
  constructor(
    scene: THREE.Scene,
    player: Player,
    params: {
      object: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      scale?: THREE.Vector3 | number;
    }
  ) {
    super(scene, params);
    this.player = player;
  }

  public getPlayer(): Player {
    return this.player;
  }
}
