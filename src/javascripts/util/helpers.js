import {Mesh, Line} from 'three';

export const cap = (value, cap1, cap2) => {
  if (cap1 > cap2) {
    return Math.max(cap2, Math.min(cap1, value));
  }
  return Math.max(cap1, Math.min(cap2, value));
};

export const rand = (min, max) => min + Math.floor(Math.random() * (max - min));

export const mirrorPosition = (pos, xAxis = 0) => {
  let {z} = pos;
  z -= (z - xAxis) * 2;
  return {
    x: -pos.x,
    y: pos.y,
    z,
  };
};

export const mirrorVelocity = vel => {
  return {
    x: -vel.x,
    y: vel.y,
    z: -vel.z,
  };
};

export const setTransparency = (object, transparency) => {
  object.traverse(child => {
    if (child instanceof Mesh) {
      child.material.transparent = transparency !== 1;
      child.material.opacity = transparency;
    }
    if (child instanceof Line) {
      child.material.transparent = transparency !== 1;
      child.material.opacity = transparency;
    }
  });
};
