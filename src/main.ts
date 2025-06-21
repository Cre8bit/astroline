import { setupLighting } from "./core/lighting";
import { SceneManager } from "./core/sceneManager";
import { Player } from "./entities/player";
import { Moon } from "./entities/moon";

const sceneManager = new SceneManager();
sceneManager.setupScene();

const moon = new Moon("/models/moon/Moon.glb");
moon.loadModel().then((loadedMoon) => {
  sceneManager.scene.add(loadedMoon);
}).catch(console.error);


const player = new Player();
setupLighting(sceneManager.scene);


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