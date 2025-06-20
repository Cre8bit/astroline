import {
  scene,
  camera,
  renderer,
  resizeRendererToDisplaySize,
} from "./core/scene";
import { setupLighting } from "./core/lighting";
import { loadMoonModel, moon } from "./entities/moon";
import { handleFreeCamMovement } from "./entities/player";

setupLighting();
loadMoonModel();

function animate(): void {
  requestAnimationFrame(animate);
  if (moon.value) moon.value.rotation.y += 0.001;
  handleFreeCamMovement();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", resizeRendererToDisplaySize);
