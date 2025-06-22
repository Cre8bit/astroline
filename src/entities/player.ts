import { Entity } from "../core/entity";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "three";

export class Player extends Entity {
  public controls: PointerLockControls;
  public camera: THREE.PerspectiveCamera;
  private keysPressed: { [key: string]: boolean };
  private readonly velocity: THREE.Vector3;
  private moveSpeed: number;

  constructor(
    scene: THREE.Scene,
    params: {
      object?: THREE.Object3D;
      position?: THREE.Vector3 | [number, number, number];
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
}
