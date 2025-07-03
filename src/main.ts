import { SetupSpaceLighting, Starfield } from "./core/lighting";
import { SceneManager } from "./core/sceneManager";
import { Player } from "./entities/player";
import { Moon } from "./entities/moon";
import { Cristal } from "./entities/cristal";
import { TrainHead } from "./entities/trainHead";
import { GLBModelLoader } from "./core/modelLoader";
import * as THREE from "three";
import { PointerLockCameraController } from "./controller/pointerLockCameraController";
import { TrainController } from "./controller/trainController";
import { ControllerManager } from "./core/controllerManager";
import { GameManager } from "./core/gameManager";

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

//Setup entities
const player = new Player(sceneManager.scene, {
  position: [-30, 80, 0],
  rotation: [0, -Math.PI / 2, 0],
});
const moon1 = new Moon(sceneManager.scene, {
  object: moonModel.clone(),
  scale: 0.5,
});
const cristal = new Cristal(sceneManager.scene, { object: cristalModel.clone() });
const trainHead = new TrainHead(sceneManager.scene, {
  object: trainHeadModel.clone(),
  position: [0, 80, 0],
  riderOffset: [0, 1.8, 0],
});

// Create controllers
const playerController = new PointerLockCameraController();
const trainController = new TrainController();

// Bind controllers
const controllerManager = new ControllerManager();
controllerManager.bind(player, playerController);
controllerManager.bind(trainHead, trainController);

// Game manager
const gameManager = new GameManager(
  [player, trainHead, moon1],
  controllerManager,
  sceneManager.scene
);
gameManager.bindPlayerToTrain(player, trainHead);

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  gameManager.update(delta);

  // Update player coordinates HUD
  const playerPosition = player.getPosition();
  hud.textContent = `X: ${playerPosition.x.toFixed(
    2
  )} Y: ${playerPosition.y.toFixed(2)} Z: ${playerPosition.z.toFixed(2)}`;
  // Update FPS counter
  const currentFrameTime = performance.now();
  const fps = (1 / ((currentFrameTime - lastFrameTime) / 1000)).toFixed(1);
  lastFrameTime = currentFrameTime;
  fpsCounter.textContent = `FPS: ${fps}`;

  sceneManager.renderer.render(
    sceneManager.scene,
    playerController.getCamera()
  );
  // debugger;
}
animate();

window.addEventListener("resize", () => {
  sceneManager.resizeRendererToDisplaySize();
  playerController.getCamera().aspect = window.innerWidth / window.innerHeight;
  playerController.getCamera().updateProjectionMatrix();
});
