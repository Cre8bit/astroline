import * as THREE from "three";

export interface MovementIntent {
  direction: THREE.Vector3;
  targetRotation: THREE.Quaternion;
  speed: number;
}
