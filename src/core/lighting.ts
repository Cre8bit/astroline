import * as THREE from "three";


export function SetupSpaceLighting(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  const directions = [
    { color: 0xfff8e7, intensity: 2, pos: [100, 200, 150] },
    { color: 0xe7f8ff, intensity: 2, pos: [-150, 100, 200] },
    { color: 0xf8e7ff, intensity: 2, pos: [200, -100, -150] }
  ];

  directions.forEach(({ color, intensity, pos }) => {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(pos[0], pos[1], pos[2]);
    scene.add(light);
  });
}

export class Starfield {
  private readonly starPoints: THREE.Points;
  private readonly starOpacities: Float32Array;
  constructor(scene: THREE.Scene) {
    const starCount = 1000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starOpacities = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const distance = 500 + Math.random() * 1500;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = distance * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = distance * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = distance * Math.cos(phi);

      const c = 0.8 + Math.random() * 0.2;
      starColors[i * 3] = c;
      starColors[i * 3 + 1] = c;
      starColors[i * 3 + 2] = c;

      starOpacities[i] = Math.random() * Math.PI * 2;

    }

    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

    this.starOpacities = starOpacities;
    
    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 1.0
    });

    this.starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(this.starPoints);

    this.animateStars();
  }

  private animateStars() {
    const geometry = this.starPoints.geometry;
  const colors = geometry.getAttribute("color") as THREE.BufferAttribute;

  const flicker = () => {
    const time = performance.now() * 0.001;

    for (let i = 0; i < this.starOpacities.length; i++) {
      const phase = this.starOpacities[i];
      const intensity = 0.7 + 0.3 * Math.sin(time + phase);
      colors.array[i * 3] = intensity;
      colors.array[i * 3 + 1] = intensity;
      colors.array[i * 3 + 2] = intensity;
    }

    colors.needsUpdate = true;
    requestAnimationFrame(flicker);
  };

  flicker();
  }
}