import * as THREE from "three";

export class SceneManager {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;

  constructor() {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  setupScene() {
    this.scene.background = new THREE.Color(0x000000);

    window.addEventListener("resize", () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  resizeRendererToDisplaySize = (): void => {
    if (this.renderer) {
      const canvas = this.renderer.domElement;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== width || canvas.height !== height) {
        this.renderer.setSize(width, height, false);
      }
    }
  };
}
