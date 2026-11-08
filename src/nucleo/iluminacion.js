import * as THREE from 'three';

export function configurarIluminacion(scene) {
  const ambiente = new THREE.HemisphereLight(0xd8f2ff, 0x334047, 2.1);
  scene.add(ambiente);

  const principal = new THREE.DirectionalLight(0xfff2d8, 3.2);
  principal.position.set(6, 12, 8);
  principal.castShadow = true;
  principal.shadow.mapSize.set(1024, 1024);
  principal.shadow.camera.left = -12;
  principal.shadow.camera.right = 12;
  principal.shadow.camera.top = 12;
  principal.shadow.camera.bottom = -12;
  scene.add(principal);

  const relleno = new THREE.DirectionalLight(0x82cfff, 1.1);
  relleno.position.set(-8, 5, -6);
  scene.add(relleno);
  return { ambiente, principal, relleno };
}
