import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Controller } from "./controller";
import type { MovementIntent } from "../core/interfaces/movementIntent";
import { PlayerModeEnum } from "../core/enums/playerModeEnum";
import type { Player } from "../entities/player";

export class PlayerController extends Controller {
  private readonly controls: PointerLockControls;
  private readonly camera: THREE.PerspectiveCamera;
  private mode: PlayerModeEnum = PlayerModeEnum.FreeCam;
  private keysPressed: { [key: string]: boolean } = {};
  private readonly baseSpeed: number = 40;
  private readonly maxSpeed: number = 100;
  private moveSpeed: number = this.baseSpeed;

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.controls = new PointerLockControls(this.camera, document.body);
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
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  public getControls(): PointerLockControls {
    return this.controls;
  }
  public isBoosting(): boolean {
    return !!this.keysPressed["shift"];
  }
  private toggleMode() {
    this.mode =
      this.mode === PlayerModeEnum.Train
        ? PlayerModeEnum.FreeCam
        : PlayerModeEnum.Train;
    console.log(`Switched mode to ${this.mode}`);
  }
 public getMode(): PlayerModeEnum {
    return this.mode;
  }
   public syncWithPlayer(player: Player): void {
    this.controls.object.position.copy(player.getPosition());
    const playerRotation = player.getRotation();
    this.controls.object.quaternion.copy(playerRotation);
    this.controls.object.rotation.setFromQuaternion(playerRotation);
  }
}
