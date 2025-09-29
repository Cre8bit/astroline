import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import type { MovementIntent } from "../core/interfaces/movementIntent.interface";
import { CameraController } from "./base/cameraController";
import { PlayerModeEnum } from "../core/enums/playerMode.enum";

export class PointerLockCameraController extends CameraController<
  THREE.PerspectiveCamera,
  PointerLockControls
> {
  private keysPressed: { [key: string]: boolean } = {};
  private readonly baseSpeed: number = 40;
  private readonly maxSpeed: number = 100;
  private moveSpeed: number = this.baseSpeed;

  constructor() {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    super(camera, new PointerLockControls(camera, document.body));
    this.setupListeners();
  }

  private setupListeners() {
    document.body.addEventListener("click", () => this.controls.lock());

    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;

      if (e.key.toLowerCase() === "x") {
        this.toggleMode();
      }
    });
    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  public computeIntent(): MovementIntent {
    if (this.mode !== PlayerModeEnum.FreeCam) {
      return {
        direction: new THREE.Vector3(),
        targetRotation: this.controls.object.quaternion.clone(),
        speed: 0,
      };
    }
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
  public isBoosting(): boolean {
    return !!this.keysPressed["shift"];
  }
  public getForwardDirection(): THREE.Vector3 {
    const camForward = new THREE.Vector3();
    this.getCamera().getWorldDirection(camForward).normalize();
    return camForward;
  }
}
