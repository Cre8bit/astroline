import { Entity } from "../core/entity";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";

export class Player extends Entity {
  public controls: PointerLockControls;
  public camera: THREE.PerspectiveCamera;
  private keysPressed: { [key: string]: boolean };
  private readonly velocity: THREE.Vector3;
  private moveSpeed: number;

  constructor() {
    super();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.controls = new PointerLockControls(this.camera, document.body);
    this.controls.object.position.set(0, 1, 100);
    this.keysPressed = {};
    this.velocity = new THREE.Vector3();
    this.moveSpeed = 0.1;
    this.setupControls();
  }

  get controlObject() {
    return this.controls.object;
  }

  setupControls() {
    document.body.addEventListener("click", () => this.controls.lock());

    window.addEventListener("keydown", (e) => {
      this.keysPressed[e.key.toLowerCase()] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keysPressed[e.key.toLowerCase()] = false;
    });
  }

  handleFreeCamMovement() {
    this.velocity.set(0, 0, 0);
    if (this.keysPressed["z"]) this.velocity.z = this.moveSpeed;
    if (this.keysPressed["s"]) this.velocity.z = -this.moveSpeed;
    if (this.keysPressed["q"]) this.velocity.x = -this.moveSpeed;
    if (this.keysPressed["d"]) this.velocity.x = this.moveSpeed;
    if (this.keysPressed["shift"]) {
      this.moveSpeed = 0.5;
    } else {
      this.moveSpeed = 0.1;
    }

    const playerObject = this.controls.object;
    const playerPosition = playerObject.position;
    if (this.keysPressed[" "]) playerPosition.y += this.moveSpeed;
    if (this.keysPressed["a"]) playerPosition.y -= this.moveSpeed;

    this.controls.moveRight(this.velocity.x);
    this.controls.moveForward(this.velocity.z);
  }
}
