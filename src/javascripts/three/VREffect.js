/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 *
 * WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 *
 * Firefox: http://mozvr.com/downloads/
 * Chromium: https://webvr.info/get-chrome
 *
 */
/* global VRFrameData */
import {Vector3, PerspectiveCamera, Matrix4} from 'three';

const VREffect = function(renderer, onError) {
  let vrDisplay; let
    vrDisplays;
  const eyeTranslationL = new Vector3();
  const eyeTranslationR = new Vector3();
  let renderRectL; let
    renderRectR;

  let frameData = null;

  if ('VRFrameData' in window) {
    frameData = new VRFrameData();
  }

  function gotVRDisplays(displays) {
    vrDisplays = displays;

    if (displays.length > 0) {
      vrDisplay = displays[0];
    } else if (onError) onError('HMD not available');
  }

  if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(gotVRDisplays).catch(() => {
      console.warn('THREE.VREffect: Unable to get VR Displays');
    });
  }

  //

  this.isPresenting = false;
  this.scale = 1;

  const scope = this;

  let rendererSize = renderer.getSize();
  let rendererUpdateStyle = false;
  let rendererPixelRatio = renderer.getPixelRatio();

  this.getVRDisplay = function() {
    return vrDisplay;
  };

  this.setVRDisplay = function(value) {
    vrDisplay = value;
  };

  this.getVRDisplays = function() {
    console.warn('THREE.VREffect: getVRDisplays() is being deprecated.');
    return vrDisplays;
  };

  this.setSize = function(width, height, updateStyle) {
    rendererSize = { width, height };
    rendererUpdateStyle = updateStyle;

    if (scope.isPresenting) {
      const eyeParamsL = vrDisplay.getEyeParameters('left');
      renderer.setPixelRatio(1);
      renderer.setSize(eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false);
    } else {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(width, height, updateStyle);
    }
  };

  // fullscreen

  const canvas = renderer.domElement;
  // let requestFullscreen;
  // let exitFullscreen;
  // let fullscreenElement;
  const defaultLeftBounds = [0.0, 0.0, 0.5, 1.0];
  const defaultRightBounds = [0.5, 0.0, 0.5, 1.0];

  function onVRDisplayPresentChange() {
    const wasPresenting = scope.isPresenting;
    scope.isPresenting = vrDisplay !== undefined && vrDisplay.isPresenting;

    if (scope.isPresenting) {
      const eyeParamsL = vrDisplay.getEyeParameters('left');
      const eyeWidth = eyeParamsL.renderWidth;
      const eyeHeight = eyeParamsL.renderHeight;

      if (!wasPresenting) {
        rendererPixelRatio = renderer.getPixelRatio();
        rendererSize = renderer.getSize();

        renderer.setPixelRatio(1);
        renderer.setSize(eyeWidth * 2, eyeHeight, false);
      }
    } else if (wasPresenting) {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(rendererSize.width, rendererSize.height, rendererUpdateStyle);
    }
  }

  window.addEventListener('vrdisplaypresentchange', onVRDisplayPresentChange, false);

  this.setFullScreen = function(boolean) {
    return new Promise((resolve, reject) => {
      if (vrDisplay === undefined) {
        reject(new Error('No VR hardware found.'));
        return;
      }

      if (scope.isPresenting === boolean) {
        resolve();
        return;
      }

      if (boolean) {
        resolve(vrDisplay.requestPresent([{ source: canvas }]));
      } else {
        resolve(vrDisplay.exitPresent());
      }
    });
  };

  this.requestPresent = function() {
    return this.setFullScreen(true);
  };

  this.exitPresent = function() {
    return this.setFullScreen(false);
  };

  this.requestAnimationFrame = function(f) {
    if (vrDisplay !== undefined) {
      return vrDisplay.requestAnimationFrame(f);
    }

    return window.requestAnimationFrame(f);
  };

  this.cancelAnimationFrame = function(h) {
    if (vrDisplay !== undefined) {
      vrDisplay.cancelAnimationFrame(h);
    } else {
      window.cancelAnimationFrame(h);
    }
  };

  this.submitFrame = function() {
    if (vrDisplay !== undefined && scope.isPresenting) {
      vrDisplay.submitFrame();
    }
  };

  this.autoSubmitFrame = true;

  // render

  const cameraL = new PerspectiveCamera();
  cameraL.layers.enable(1);

  const cameraR = new PerspectiveCamera();
  cameraR.layers.enable(2);

  this.render = function(scene, camera, renderTarget, forceClear) {
    if (vrDisplay && scope.isPresenting) {
      const {autoUpdate} = scene;

      if (autoUpdate) {
        scene.updateMatrixWorld();
        scene.autoUpdate = false;
      }

      const eyeParamsL = vrDisplay.getEyeParameters('left');
      const eyeParamsR = vrDisplay.getEyeParameters('right');

      eyeTranslationL.fromArray(eyeParamsL.offset);
      eyeTranslationR.fromArray(eyeParamsR.offset);

      if (Array.isArray(scene)) {
        console.warn('THREE.VREffect.render() no longer supports arrays. Use object.layers instead.');
        scene = scene[0];
      }

      // When rendering we don't care what the recommended size is, only what the actual size
      // of the backbuffer is.
      const size = renderer.getSize();
      const layers = vrDisplay.getLayers();
      let leftBounds;
      let rightBounds;

      if (layers.length) {
        const layer = layers[0];

        leftBounds = layer.leftBounds !== null && layer.leftBounds.length === 4 ? layer.leftBounds : defaultLeftBounds;
        rightBounds = layer.rightBounds !== null && layer.rightBounds.length === 4 ? layer.rightBounds : defaultRightBounds;
      } else {
        leftBounds = defaultLeftBounds;
        rightBounds = defaultRightBounds;
      }

      renderRectL = {
        x: Math.round(size.width * leftBounds[0]),
        y: Math.round(size.height * leftBounds[1]),
        width: Math.round(size.width * leftBounds[2]),
        height: Math.round(size.height * leftBounds[3]),
      };
      renderRectR = {
        x: Math.round(size.width * rightBounds[0]),
        y: Math.round(size.height * rightBounds[1]),
        width: Math.round(size.width * rightBounds[2]),
        height: Math.round(size.height * rightBounds[3]),
      };

      if (renderTarget) {
        renderer.setRenderTarget(renderTarget);
        renderTarget.scissorTest = true;
      } else {
        renderer.setRenderTarget(null);
        renderer.setScissorTest(true);
      }

      if (renderer.autoClear || forceClear) renderer.clear();

      if (camera.parent === null) camera.updateMatrixWorld();

      camera.matrixWorld.decompose(cameraL.position, cameraL.quaternion, cameraL.scale);
      camera.matrixWorld.decompose(cameraR.position, cameraR.quaternion, cameraR.scale);

      const {scale} = this;
      cameraL.translateOnAxis(eyeTranslationL, scale);
      cameraR.translateOnAxis(eyeTranslationR, scale);

      if (vrDisplay.getFrameData) {
        vrDisplay.depthNear = camera.near;
        vrDisplay.depthFar = camera.far;

        vrDisplay.getFrameData(frameData);

        cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
        cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;
      } else {
        cameraL.projectionMatrix = fovToProjection(eyeParamsL.fieldOfView, true, camera.near, camera.far);
        cameraR.projectionMatrix = fovToProjection(eyeParamsR.fieldOfView, true, camera.near, camera.far);
      }

      // render left eye
      if (renderTarget) {
        renderTarget.viewport.set(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
        renderTarget.scissor.set(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
      } else {
        renderer.setViewport(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
        renderer.setScissor(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
      }
      renderer.render(scene, cameraL, renderTarget, forceClear);

      // render right eye
      if (renderTarget) {
        renderTarget.viewport.set(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
        renderTarget.scissor.set(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
      } else {
        renderer.setViewport(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
        renderer.setScissor(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
      }
      renderer.render(scene, cameraR, renderTarget, forceClear);

      if (renderTarget) {
        renderTarget.viewport.set(0, 0, size.width, size.height);
        renderTarget.scissor.set(0, 0, size.width, size.height);
        renderTarget.scissorTest = false;
        renderer.setRenderTarget(null);
      } else {
        renderer.setViewport(0, 0, size.width, size.height);
        renderer.setScissorTest(false);
      }

      if (autoUpdate) {
        scene.autoUpdate = true;
      }

      if (scope.autoSubmitFrame) {
        scope.submitFrame();
      }

      return;
    }

    // Regular render mode if not HMD

    renderer.render(scene, camera, renderTarget, forceClear);
  };

  this.dispose = function() {
    window.removeEventListener('vrdisplaypresentchange', onVRDisplayPresentChange, false);
  };

  //

  function fovToNDCScaleOffset(fov) {
    const pxscale = 2.0 / (fov.leftTan + fov.rightTan);
    const pxoffset = (fov.leftTan - fov.rightTan) * pxscale * 0.5;
    const pyscale = 2.0 / (fov.upTan + fov.downTan);
    const pyoffset = (fov.upTan - fov.downTan) * pyscale * 0.5;
    return { scale: [pxscale, pyscale], offset: [pxoffset, pyoffset] };
  }

  function fovPortToProjection(fov, rightHanded, zNear, zFar) {
    rightHanded = rightHanded === undefined ? true : rightHanded;
    zNear = zNear === undefined ? 0.01 : zNear;
    zFar = zFar === undefined ? 10000.0 : zFar;

    const handednessScale = rightHanded ? -1.0 : 1.0;

    // start with an identity matrix
    const mobj = new Matrix4();
    const m = mobj.elements;

    // and with scale/offset info for normalized device coords
    const scaleAndOffset = fovToNDCScaleOffset(fov);

    // X result, map clip edges to [-w,+w]
    m[0 * 4 + 0] = scaleAndOffset.scale[0];
    m[0 * 4 + 1] = 0.0;
    m[0 * 4 + 2] = scaleAndOffset.offset[0] * handednessScale;
    m[0 * 4 + 3] = 0.0;

    // Y result, map clip edges to [-w,+w]
    // Y offset is negated because this proj matrix transforms from world coords with Y=up,
    // but the NDC scaling has Y=down (thanks D3D?)
    m[1 * 4 + 0] = 0.0;
    m[1 * 4 + 1] = scaleAndOffset.scale[1];
    m[1 * 4 + 2] = -scaleAndOffset.offset[1] * handednessScale;
    m[1 * 4 + 3] = 0.0;

    // Z result (up to the app)
    m[2 * 4 + 0] = 0.0;
    m[2 * 4 + 1] = 0.0;
    m[2 * 4 + 2] = zFar / (zNear - zFar) * -handednessScale;
    m[2 * 4 + 3] = (zFar * zNear) / (zNear - zFar);

    // W result (= Z in)
    m[3 * 4 + 0] = 0.0;
    m[3 * 4 + 1] = 0.0;
    m[3 * 4 + 2] = handednessScale;
    m[3 * 4 + 3] = 0.0;

    mobj.transpose();

    return mobj;
  }

  function fovToProjection(fov, rightHanded, zNear, zFar) {
    const DEG2RAD = Math.PI / 180.0;

    const fovPort = {
      upTan: Math.tan(fov.upDegrees * DEG2RAD),
      downTan: Math.tan(fov.downDegrees * DEG2RAD),
      leftTan: Math.tan(fov.leftDegrees * DEG2RAD),
      rightTan: Math.tan(fov.rightDegrees * DEG2RAD),
    };

    return fovPortToProjection(fovPort, rightHanded, zNear, zFar);
  }
};

// module.exports = VREffect;
export default VREffect;