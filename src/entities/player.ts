import { Entity } from "../core/entity";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";
import { PlayerMode } from "../enums/playerModeEnum";

export class Player extends Entity {
  public controls: PointerLockControls;
  public camera: THREE.PerspectiveCamera;
  private keysPressed: { [key: string]: boolean };
  private moveSpeed: number;
  private mode: PlayerMode = PlayerMode.FreeCam;
  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
      rotation?: THREE.Euler | [number, number, number];
      scale?: THREE.Vector3 | number;
    } = {}
  ) {
    super(scene, params);
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.controls = new PointerLockControls(this.camera, document.body);
    if (params.rotation instanceof THREE.Euler) {
      this.setPlayerRotation(params.rotation);
    } else if (Array.isArray(params.rotation)) {
      this.setPlayerRotation(
        params.rotation[0] ?? 0,
        params.rotation[1] ?? 0,
        params.rotation[2] ?? 0
      );
    }
    if (Array.isArray(params.position)) {
      this.setPlayerPosition(
        params.position[0],
        params.position[1],
        params.position[2]
      );
    } else {
      this.setPlayerPosition(params.position || new THREE.Vector3(0, 0, 0));
    }
    this.keysPressed = {};
    this.moveSpeed = 0.1;
    this.setupControls();
  }
  setPlayerPosition(position: THREE.Vector3): void;
  setPlayerPosition(x: number, y: number, z: number): void;
  setPlayerPosition(
    arg1: THREE.Vector3 | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Vector3) {
      this.controls.object.position.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.controls.object.position.set(arg1, arg2, arg3);
    }
  }

  setPlayerRotation(rotation: THREE.Euler): void;
  setPlayerRotation(yaw: number, pitch: number, roll: number): void;
  setPlayerRotation(
    arg1: THREE.Euler | number,
    arg2?: number,
    arg3?: number
  ): void {
    if (arg1 instanceof THREE.Euler) {
      this.controls.object.rotation.copy(arg1);
    } else if (
      typeof arg1 === "number" &&
      typeof arg2 === "number" &&
      typeof arg3 === "number"
    ) {
      this.controls.object.rotation.set(arg1, arg2, arg3);
    }
  }

  getPlayerPosition(): THREE.Vector3 {
    return this.controls.object.position.clone();
  }

  setupControls() {
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

  toggleMode() {
    this.mode =
      this.mode === PlayerMode.Train ? PlayerMode.FreeCam : PlayerMode.Train;
    console.log(`Switched mode to ${this.mode}`);
  }

  handleFreeCamMovement() {
    if (this.mode !== "freecam") return;

    if (this.keysPressed["shift"]) {
      this.moveSpeed = 0.8;
    } else {
      this.moveSpeed = 0.1;
    }

    const direction = new THREE.Vector3();
    this.controls.getDirection(direction);

    const object = this.controls.object;

    if (this.keysPressed["z"]) {
      object.position.add(direction.clone().multiplyScalar(this.moveSpeed));
    }
    if (this.keysPressed["s"]) {
      object.position.add(direction.clone().multiplyScalar(-this.moveSpeed));
    }

    const right = new THREE.Vector3();
    this.camera.getWorldDirection(right);
    right.cross(this.camera.up).normalize();

    if (this.keysPressed["d"]) {
      object.position.add(right.clone().multiplyScalar(this.moveSpeed));
    }
    if (this.keysPressed["q"]) {
      object.position.add(right.clone().multiplyScalar(-this.moveSpeed));
    }

    if (this.keysPressed[" "]) {
      object.position.y += this.moveSpeed;
    }
    if (this.keysPressed["a"]) {
      object.position.y -= this.moveSpeed;
    }
  }
  isOnTrain(): boolean {
    return this.mode === PlayerMode.Train;
  }
  isShiftPressed(): boolean {
    return !!this.keysPressed["shift"];
  }
}
