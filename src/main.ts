import { SetupSpaceLighting, Starfield } from "./core/lighting";
import { SceneManager } from "./core/sceneManager";
import { Player } from "./entities/player";
import { Moon } from "./entities/moon";
import { Cristal } from "./entities/cristal";
import { TrainHead } from "./entities/trainHead";
import { GLBModelLoader } from "./utils/modelLoader";
import * as THREE from "three";
import { PointerLockCameraController } from "./controller/pointerLockCameraController";
import { TrainController } from "./controller/trainController";
import { ControllerManager } from "./core/controllerManager";
import { GameManager } from "./core/gameManager";
import { initializeBVH } from "./utils/bvhInit";
import { raycastingService } from "./services/raycasting.service";
import { bvhDebugger } from "./services/bvhDebugger.service";
import { rayDebugger } from "./services/rayDebugger.service";

// Initialize BVH methods on BufferGeometry prototype
initializeBVH();

//Player coordinates HUD
const hud = document.getElementById("hud-coordinates")!;
// Add FPS counter element
const fpsCounter = document.getElementById("hud-fps")!;
let lastFrameTime = performance.now();
// Add performance monitoring element
const performanceCounter = document.getElementById("hud-performance")!;
let performanceLogTimer = 0;

// Initialize clock for animation timing
const clock = new THREE.Clock();

//Load models
const moonModel = await GLBModelLoader.load("/models/moon/Moon.glb", {
  bvh: true,
});
const cristalModel = await GLBModelLoader.load("/models/cristal/Cristal.glb", {
  bvh: false,
});
const trainHeadModel = await GLBModelLoader.load(
  "/models/train/head/Train_Head.glb",
  { bvh: true }
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

const cristal = new Cristal(sceneManager.scene, {
  object: cristalModel.clone(),
  position: [0, 72, 0],
});

const trainHead = new TrainHead(sceneManager.scene, {
  object: trainHeadModel.clone(),
  position: [0, 90, 0],
  riderOffset: [0, 1.8, 0],
});

// Initialize BVH debugger
const bvhDebuggerService = bvhDebugger();
bvhDebuggerService.initialize(sceneManager.scene, true);

bvhDebuggerService.registerGroupToggle({
  key: "p",
  groupName: "moon",
  description: "Moon BVH visualization",
  defaultEnabled: false,
});

bvhDebuggerService.setGroupConfig("moon", {
  color: 0x00ff00,
  opacity: 0.3,
  depth: 8,
  showLeafNodes: true,
  showInternalNodes: true,
  wireframe: true,
});

bvhDebuggerService.registerGroupToggle({
  key: "o",
  groupName: "train",
  description: "Train head visualization",
  defaultEnabled: false,
});

bvhDebuggerService.setGroupConfig("train", {
  color: 0xff0000,
  opacity: 0.3,
  depth: 8,
  showLeafNodes: true,
  showInternalNodes: true,
  wireframe: true,
});

// Register objects for automatic BVH updates
bvhDebuggerService.registerObject("moon", moon1.object, () => moon1.getId());
bvhDebuggerService.registerObject("train", trainHead.object, () =>
  trainHead.getId()
);

// Initialize ray debugger
const rayDebuggerService = rayDebugger();
rayDebuggerService.initialize(sceneManager.scene, true);

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

  updateHUD(delta);
  updateBVHDebugger();
  updateRayDebugger();

  sceneManager.renderer.render(
    sceneManager.scene,
    playerController.getCamera()
  );
}
animate();

function updateHUD(delta: number) {
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

  // Log BVH performance stats every 5 seconds
  performanceLogTimer += delta;
  if (performanceLogTimer > 1.0) {
    const stats = raycastingService().getFramePerformanceStats();

    // Update performance HUD
    performanceCounter.textContent = `BVH: ${stats.frameAverageTime.toFixed(
      3
    )}ms | Hits: ${stats.frameRaycasts}`;
    performanceLogTimer = 0;
  }
}

function updateBVHDebugger() {
  bvhDebuggerService.updateAll();
}

function updateRayDebugger() {
  rayDebuggerService.updateAll();
}

window.addEventListener("resize", () => {
  sceneManager.resizeRendererToDisplaySize();
  playerController.getCamera().aspect = window.innerWidth / window.innerHeight;
  playerController.getCamera().updateProjectionMatrix();
});
