/**
 * XR Controller implementation compatible with Three.js v0.176.0
 * Based on XRControllerModelFactory
 */

import {
  Quaternion,
  Vector3,
  Group
} from 'three';

class XRControls {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;
    this.xrSession = null;
    this.controllers = [];
    this.scale = 1;
    this.standing = false;
    this.userHeight = 1.6;
    
    this.controllerGroup = new Group();
    this.camera.add(this.controllerGroup);
  }

  async connect() {
    if (!navigator.xr) {
      console.warn('WebXR not supported in this browser');
      return false;
    }
    
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (!supported) {
        console.warn('immersive-vr session not supported');
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error checking XR support:', err);
      return false;
    }
  }

  async startXR() {
    if (!navigator.xr) return;
    
    try {
      this.xrSession = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });
      
      await this.renderer.xr.setSession(this.xrSession);
      this.setupControllers();
      
      return true;
    } catch (err) {
      console.error('Error starting XR session:', err);
      return false;
    }
  }

  setupControllers() {
    // Setup controller input sources
    this.xrSession.addEventListener('inputsourceschange', this.onInputSourcesChange.bind(this));
  }

  onInputSourcesChange(event) {
    // Handle new controllers
    event.added.forEach(inputSource => {
      const controller = this.renderer.xr.getController(this.controllers.length);
      this.controllerGroup.add(controller);
      this.controllers.push({
        inputSource,
        controller
      });
    });
    
    // Handle removed controllers
    event.removed.forEach(inputSource => {
      const index = this.controllers.findIndex(info => info.inputSource === inputSource);
      if (index !== -1) {
        const controller = this.controllers[index].controller;
        this.controllerGroup.remove(controller);
        this.controllers.splice(index, 1);
      }
    });
  }

  update() {
    // XR pose updates are handled automatically by three.js renderer.xr
  }

  dispose() {
    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
    }
    
    this.controllers = [];
    if (this.controllerGroup.parent) {
      this.controllerGroup.parent.remove(this.controllerGroup);
    }
  }
}

export { XRControls };
