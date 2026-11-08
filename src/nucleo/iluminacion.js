import * as THREE from 'three';

export function configurarIluminacion(scene) {
  const ambiente = new THREE.HemisphereLight(0xd8f2ff, 0x334047, 1.7);
  scene.add(ambiente);
  const principal = new THREE.DirectionalLight(0xfff2d8, 2.5);
  principal.position.set(6, 12, 8);
  principal.castShadow = true;
  principal.shadow.mapSize.set(2048, 2048);
  principal.shadow.camera.left = -15;
  principal.shadow.camera.right = 15;
  principal.shadow.camera.top = 15;
  principal.shadow.camera.bottom = -15;
  principal.shadow.bias = -0.00015;
  principal.shadow.normalBias = 0.025;
  principal.shadow.radius = 5;
  scene.add(principal);
  const relleno = new THREE.DirectionalLight(0x82cfff, 0.65);
  relleno.position.set(-8, 5, -6);
  scene.add(relleno);
  return { ambiente, principal, relleno };
}
