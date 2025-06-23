import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { MovementIntentEnum } from "./enums/mouvementIntentEnum";
import { Controller } from "./controller";

export class PlayerController extends Controller{
  private readonly controls: PointerLockControls;
  private readonly camera: THREE.PerspectiveCamera;
  private keysPressed: { [key: string]: boolean } = {};
  private readonly baseSpeed: number = 40;
  private readonly maxSpeed: number = 100;
  private moveSpeed: number = this.baseSpeed;
  
  constructor(camera: THREE.PerspectiveCamera, controls: PointerLockControls) {
    super();
    this.camera = camera;
    this.controls = controls;
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  public computeInputIntent(): MovementIntentEnum {
    if (this.keysPressed["shift"]) {
      this.moveSpeed = this.maxSpeed;
    } else {
      this.moveSpeed = this.baseSpeed;
    }

    let direction = new THREE.Vector3();
    this.controls.getDirection(direction);

    let move = new THREE.Vector3();

    if (this.keysPressed["z"]) {
      move.add(direction.clone());
    }
    if (this.keysPressed["s"]) {
      move.add(direction.clone().negate());
    }

    const right = new THREE.Vector3();
    this.camera.getWorldDirection(right);
    right.cross(this.camera.up).normalize();

    if (this.keysPressed["d"]) {
      move.add(right.clone());
    }
    if (this.keysPressed["q"]) {
      move.add(right.clone().negate());
    }

    if (this.keysPressed[" "]) {
      move.y += 1;
    }
    if (this.keysPressed["a"]) {
      move.y -= 1;
    }

    move.normalize();
    const targetRotation = this.controls.object.quaternion.clone();

    return {
      direction: move,
      targetRotation: targetRotation,
      speed: this.moveSpeed,
    };
  }

  public isShiftPressed(): boolean {
    return !!this.keysPressed["shift"];
  }
}
