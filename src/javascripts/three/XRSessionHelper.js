/**
 * XR Session Helper compatible with Three.js v0.176.0
 * Replacement for deprecated VREffect
 */

import { Vector2 } from 'three';

// 简化版本，避免构造函数错误
class XRSessionHelper {
  constructor(renderer) {
    if (!renderer) {
      console.error('XRSessionHelper requires a renderer instance');
      return;
    }

    this.renderer = renderer;
    this.originalPixelRatio = renderer.getPixelRatio();
    this.originalSize = new Vector2();
    if (renderer.getSize) {
      renderer.getSize(this.originalSize);
    } else {
      this.originalSize.set(window.innerWidth, window.innerHeight);
    }
    
    // 确保XR支持
    if (renderer.xr) {
      renderer.xr.enabled = true;
    }
  }

  /**
   * 简化的尺寸设置方法
   */
  setSize(width, height, updateStyle) {
    if (this.renderer) {
      this.renderer.setSize(width, height, updateStyle);
    }
  }

  /**
   * 简化的渲染方法
   */
  render(scene, camera) {
    if (this.renderer) {
      this.renderer.render(scene, camera);
    }
  }
}

// 确保导出格式正确
export { XRSessionHelper }; 