import * as THREE from 'three';
export interface MovementIntentEnum {
  direction: THREE.Vector3;
  targetRotation: THREE.Quaternion;
  speed: number;
}