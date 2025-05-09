/**
 * XR Session Helper compatible with Three.js v0.176.0
 * Replacement for deprecated VREffect
 */

import { WebGLRenderer } from 'three';

class XRSessionHelper {
  constructor(renderer) {
    if (!(renderer instanceof WebGLRenderer)) {
      console.error('XRSessionHelper requires a WebGLRenderer instance');
    }

    this.renderer = renderer;
    this.xrSession = null;
    this.isPresenting = false;
    this.referenceSpace = null;
    this.originalPixelRatio = renderer.getPixelRatio();
    this.originalSize = renderer.getSize(new THREE.Vector2());
    
    // Enable XR features on the renderer
    this.renderer.xr.enabled = true;
  }

  /**
   * Check if XR is supported
   */
  async checkXRSupport() {
    if (!navigator.xr) {
      console.warn('WebXR not supported');
      return false;
    }
    
    try {
      return await navigator.xr.isSessionSupported('immersive-vr');
    } catch (err) {
      console.error('Error checking XR support:', err);
      return false;
    }
  }

  /**
   * Enter VR/XR mode
   */
  async requestPresent() {
    if (!navigator.xr) {
      return Promise.reject(new Error('WebXR not supported'));
    }
    
    if (this.isPresenting) {
      return Promise.resolve();
    }
    
    try {
      // Request an immersive session
      this.xrSession = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      
      // Set up session end handling
      this.xrSession.addEventListener('end', () => {
        this.isPresenting = false;
        this.xrSession = null;
        
        // Restore original renderer settings
        this.renderer.setPixelRatio(this.originalPixelRatio);
        this.renderer.setSize(this.originalSize.width, this.originalSize.height, true);
      });
      
      // Connect the session to the renderer
      await this.renderer.xr.setSession(this.xrSession);
      
      // Get reference space
      this.referenceSpace = await this.xrSession.requestReferenceSpace('local-floor');
      
      this.isPresenting = true;
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Exit VR/XR mode
   */
  async exitPresent() {
    if (!this.xrSession || !this.isPresenting) {
      return Promise.resolve();
    }
    
    try {
      await this.xrSession.end();
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  /**
   * Set size of the renderer
   */
  setSize(width, height, updateStyle) {
    this.originalSize.width = width;
    this.originalSize.height = height;
    
    if (!this.isPresenting) {
      this.renderer.setSize(width, height, updateStyle);
    }
  }

  /**
   * Handle animation frame request
   */
  requestAnimationFrame(callback) {
    if (this.xrSession) {
      return this.xrSession.requestAnimationFrame(callback);
    }
    return window.requestAnimationFrame(callback);
  }

  /**
   * Dispose and clean up resources
   */
  dispose() {
    if (this.xrSession) {
      this.xrSession.end();
    }
    this.xrSession = null;
    this.isPresenting = false;
  }
}

export { XRSessionHelper };
