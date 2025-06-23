import { SetupSpaceLighting, Starfield } from "./core/lighting";
import { SceneManager } from "./core/sceneManager";
import { Player } from "./entities/player";
import { Moon } from "./entities/moon";
import { Cristal } from "./entities/cristal";
import { TrainHead } from "./entities/trainHead";
import { GLBModelLoader } from "./core/modelLoader";
import * as THREE from "three";

//Player coordinates HUD
const hud = document.getElementById("hud-coordinates")!;
// Add FPS counter element
const fpsCounter = document.getElementById("hud-fps")!;
let lastFrameTime = performance.now();

// Initialize clock for animation timing
const clock = new THREE.Clock();

//Load models
const moonModel = await GLBModelLoader.load("/models/moon/Moon.glb");
const cristalModel = await GLBModelLoader.load("/models/cristal/Cristal.glb");
const trainHeadModel = await GLBModelLoader.load(
  "/models/train/head/Train_Head.glb"
);

//Setup scene and lighting
const sceneManager = new SceneManager();
sceneManager.setupScene();

SetupSpaceLighting(sceneManager.scene);
const starfield = new Starfield(sceneManager.scene);

//Setup player
const player = new Player(sceneManager.scene, {
  position: [0, 40, -10],
  rotation: [0, Math.PI, 0],
});

//Setup entities
const moon1 = new Moon(sceneManager.scene, { object: moonModel.clone(), scale: 0.5 });
const cristal = new Cristal(sceneManager.scene, { object: cristalModel });
const trainHead = new TrainHead(sceneManager.scene, player, {
  object: trainHeadModel,
  position: [0, 40, 0],
});


function animate(): void {
  requestAnimationFrame(animate);

  const currentFrameTime = performance.now();
  const fps = (1 / ((currentFrameTime - lastFrameTime) / 1000)).toFixed(1);
  lastFrameTime = currentFrameTime;
  fpsCounter.textContent = `FPS: ${fps}`;
  
  let playerIntent = player.computeControllerIntent();
  let trainIntent = trainHead.computeControllerIntent();
  const delta = clock.getDelta();
  player.applyIntent(playerIntent, delta);
  trainHead.applyIntent(trainIntent, delta);

  const playerPosition = player.getPlayerPosition();
  hud.textContent = `X: ${playerPosition.x.toFixed(
    2
  )} Y: ${playerPosition.y.toFixed(2)} Z: ${playerPosition.z.toFixed(2)}`;

  sceneManager.renderer.render(sceneManager.scene, player.camera);
}
animate();

window.addEventListener("resize", () => {
  sceneManager.resizeRendererToDisplaySize();
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
});
