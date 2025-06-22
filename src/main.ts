import * as THREE from "three";
import { SetupSpaceLighting, Starfield } from "./core/lighting";
import { SceneManager } from "./core/sceneManager";
import { Player } from "./entities/player";
import { Moon } from "./entities/moon";
import { Cristal } from "./entities/cristal";
import { TrainHead } from "./entities/trainHead";
import { GLBModelLoader } from "./core/modelLoader";

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
const player = new Player(sceneManager.scene);

//Setup entities
const moon = new Moon(sceneManager.scene, { object: moonModel, scale: 0.5 });
const cristal = new Cristal(sceneManager.scene, { object: cristalModel });
const trainHead = new TrainHead(sceneManager.scene, player, {
  object: trainHeadModel,
  position: [0, 40, 0],
});

function animate(): void {
  requestAnimationFrame(animate);
  player.handleFreeCamMovement();
  sceneManager.renderer.render(sceneManager.scene, player.camera);
}
animate();

window.addEventListener("resize", () => {
  sceneManager.resizeRendererToDisplaySize();
  player.camera.aspect = window.innerWidth / window.innerHeight;
  player.camera.updateProjectionMatrix();
});
