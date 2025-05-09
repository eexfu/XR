import {SphereGeometry, MeshBasicMaterial, Mesh} from 'three';

/**
 * 注意：此文件与Three.js v0.176.0兼容
 * SphereGeometry已经是BufferGeometry，无需特殊修改
 */

export default (scene, config) => {
  const geometry = new SphereGeometry(0.01, 16, 16);
  const material = new MeshBasicMaterial({
    color: config.colors.BALL,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  return mesh;
};
