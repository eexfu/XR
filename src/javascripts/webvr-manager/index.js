/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ButtonManager = require('./button-manager.js');
const Emitter = require('./emitter.js');
const Modes = require('./modes.js');
const Util = require('./util.js');

/**
 * Helper for getting in and out of XR mode.
 */
function WebXRManager(renderer, effect, params) {
  this.params = params || {};

  this.mode = Modes.UNKNOWN;

  // Set option to hide the button.
  this.hideButton = this.params.hideButton || false;
  // Whether or not the FOV should be distorted or un-distorted. By default, it
  // should be distorted, but in the case of vertex shader based distortion,
  // ensure that we use undistorted parameters.
  this.predistorted = !!this.params.predistorted;

  // Save the THREE.js renderer and effect for later.
  this.renderer = renderer;
  this.effect = effect;
  const polyfillWrapper = document.querySelector('.webvr-polyfill-fullscreen-wrapper');
  this.button = new ButtonManager(polyfillWrapper);

  this.isFullscreenDisabled = !!Util.getQueryParameter('no_fullscreen');
  this.startMode = Modes.NORMAL;
  const startModeParam = parseInt(Util.getQueryParameter('start_mode'));
  if (!isNaN(startModeParam)) {
    this.startMode = startModeParam;
  }

  if (this.hideButton) {
    this.button.setVisibility(false);
  }

  // Initialize XR session
  this.xrSession = null;
  this.isVRCompatible = false;
  this.isVRCompatibleOverride = false;

  // Check if the browser is compatible with WebXR
  this.checkXRCompatibility().then((isCompatible) => {
    this.isVRCompatible = isCompatible;

    switch (this.startMode) {
      case Modes.MAGIC_WINDOW:
        this.setMode_(Modes.MAGIC_WINDOW);
        break;
      case Modes.VR:
        if (this.isVRCompatible) {
          this.enterXRMode_();
          this.setMode_(Modes.VR);
        } else {
          this.setMode_(Modes.NORMAL);
        }
        break;
      default:
        this.setMode_(Modes.NORMAL);
    }

    this.emit('initialized');
  });

  // Hook up button listeners.
  this.button.on('fs', this.onFSClick_.bind(this));
  this.button.on('vr', this.onVRClick_.bind(this));

  // Bind to fullscreen events.
  document.addEventListener(
    'webkitfullscreenchange',
    this.onFullscreenChange_.bind(this)
  );
  document.addEventListener(
    'mozfullscreenchange',
    this.onFullscreenChange_.bind(this)
  );
  document.addEventListener(
    'msfullscreenchange',
    this.onFullscreenChange_.bind(this)
  );
}

WebXRManager.prototype = new Emitter();

// Expose these values externally.
WebXRManager.Modes = Modes;

WebXRManager.prototype.render = function(scene, camera, timestamp) {
  // Scene may be an array of two scenes, one for each eye.
  if (scene instanceof Array) {
    this.effect.render(scene[0], camera);
  } else {
    this.effect.render(scene, camera);
  }
};

WebXRManager.prototype.setVRCompatibleOverride = function(isVRCompatible) {
  this.isVRCompatible = isVRCompatible;
  this.isVRCompatibleOverride = true;

  // Don't actually change modes, just update the buttons.
  this.button.setMode(this.mode, this.isVRCompatible);
};

WebXRManager.prototype.setFullscreenCallback = function(callback) {
  this.fullscreenCallback = callback;
};

WebXRManager.prototype.setVRCallback = function(callback) {
  this.vrCallback = callback;
};

WebXRManager.prototype.setExitFullscreenCallback = function(callback) {
  this.exitFullscreenCallback = callback;
};

/**
 * 检查浏览器是否支持WebXR
 */
WebXRManager.prototype.checkXRCompatibility = function() {
  if (!navigator.xr) {
    return Promise.resolve(false);
  }
  
  return navigator.xr.isSessionSupported('immersive-vr')
    .then((supported) => {
      return supported;
    })
    .catch(() => {
      return false;
    });
};

/**
 * Helper for entering XR mode.
 */
WebXRManager.prototype.enterXRMode_ = function() {
  if (!navigator.xr) {
    console.warn('WebXR not supported');
    return Promise.resolve(false);
  }

  const sessionInit = {
    optionalFeatures: ['local-floor', 'bounded-floor']
  };

  return navigator.xr.requestSession('immersive-vr', sessionInit)
    .then((session) => {
      this.xrSession = session;
      
      // 设置session的结束事件
      session.addEventListener('end', () => {
        this.xrSession = null;
        this.setMode_(Modes.NORMAL);
      });
      
      // 配置three.js渲染器使用XR会话
      this.renderer.xr.enabled = true;
      return this.renderer.xr.setSession(session);
    })
    .catch((error) => {
      console.error('Error entering XR mode:', error);
      return false;
    });
};

WebXRManager.prototype.setMode_ = function(mode) {
  const oldMode = this.mode;
  if (mode == this.mode) {
    console.warn('Not changing modes, already in %s', mode);
    return;
  }
  this.mode = mode;
  this.button.setMode(mode, this.isVRCompatible);

  // Emit an event indicating the mode changed.
  this.emit('modechange', mode, oldMode);
};

/**
 * Main button was clicked.
 */
WebXRManager.prototype.onFSClick_ = function() {
  switch (this.mode) {
    case Modes.NORMAL:
    case Modes.UNKNOWN:
      this.setMode_(Modes.MAGIC_WINDOW);
      this.requestFullscreen_();
      break;
    case Modes.MAGIC_WINDOW:
      if (this.isFullscreenDisabled) {
        window.history.back();
        return;
      }
      if (this.exitFullscreenCallback) {
        this.exitFullscreenCallback();
      }
      this.setMode_(Modes.NORMAL);
      this.exitFullscreen_();
      break;
  }
};

/**
 * The VR button was clicked.
 */
WebXRManager.prototype.onVRClick_ = function() {
  // 处理iOS上的iframe特殊情况
  if (this.mode == Modes.NORMAL && Util.isIOS() && Util.isIFrame()) {
    if (this.vrCallback) {
      this.vrCallback();
    } else {
      let url = window.location.href;
      url = Util.appendQueryParameter(url, 'no_fullscreen', 'true');
      url = Util.appendQueryParameter(url, 'start_mode', Modes.VR);
      top.location.href = url;
      return;
    }
  }
  
  if (this.mode === Modes.VR) {
    // 如果已经在VR模式中，退出XR会话
    if (this.xrSession) {
      this.xrSession.end();
    }
  } else {
    // 进入XR模式
    this.enterXRMode_().then((success) => {
      if (success) {
        this.setMode_(Modes.VR);
      }
    });
  }
};

WebXRManager.prototype.requestFullscreen_ = function() {
  const canvas = document.body;
  if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
  } else if (canvas.mozRequestFullScreen) {
    canvas.mozRequestFullScreen();
  } else if (canvas.webkitRequestFullscreen) {
    canvas.webkitRequestFullscreen();
  } else if (canvas.msRequestFullscreen) {
    canvas.msRequestFullscreen();
  } else if (Util.isIOS()) {
    window.scrollTo(0, 80);
  }
};

WebXRManager.prototype.exitFullscreen_ = function() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
};

/**
 * XR会话状态变化处理
 */
WebXRManager.prototype.onXRSessionEnded_ = function() {
  this.setMode_(Modes.NORMAL);
};

/**
 * 全屏状态变化处理
 */
WebXRManager.prototype.onFullscreenChange_ = function(e) {
  // If we leave full-screen, go back to normal mode.
  if (document.webkitFullscreenElement === null
      || document.mozFullScreenElement === null) {
    this.setMode_(Modes.NORMAL);
  }
};

module.exports = WebXRManager;
