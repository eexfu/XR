// Copyright 2016 Google Inc.
//
//     Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//     Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

import EventEmitter from 'eventemitter3';
import screenfull from 'screenfull';
import State from './states';

/**
 * WebXR Manager is a utility to handle XR displays
 * 更新说明: 将WebVR更新为WebXR API
 */
export default class WebXRManager extends EventEmitter {
  /**
   * Construct a new WebXRManager
   */
  constructor() {
    super();
    this.state = State.PREPARING;
    this.currentSession = null;

    // WebXR API不再使用vrdisplaypresentchange事件
    // 我们将在进入和退出会话时手动触发状态变化
    this.__onChangeFullscreen = this.__onChangeFullscreen.bind(this);
    if (screenfull.enabled) {
      document.addEventListener(screenfull.raw.fullscreenchange, this.__onChangeFullscreen);
    }
  }

  /**
   * Check if the browser is compatible with WebXR and has headsets.
   * @return {Promise<XRSystem>}
   */
  checkDisplays() {
    return WebXRManager.getXRSystem()
      .then((xrSystem) => {
        this.xrSystem = xrSystem;
        this.__setState(State.READY_TO_PRESENT);
        return xrSystem;
      })
      .catch((e) => {
        delete this.xrSystem;
        if (e.name == 'NO_DISPLAYS') {
          this.__setState(State.ERROR_NO_PRESENTABLE_DISPLAYS);
        } else if (e.name == 'WEBXR_UNSUPPORTED') {
          this.__setState(State.ERROR_BROWSER_NOT_SUPPORTED);
        } else {
          this.__setState(State.ERROR_UNKOWN);
        }
      });
  }

  /**
   * clean up object for garbage collection
   */
  remove() {
    if (this.currentSession) {
      this.currentSession.end();
      this.currentSession = null;
    }

    if (screenfull.enabled) {
      document.removeEventListener(screenfull.raw.fullscreenchanged, this.__onChangeFullscreen);
    }

    this.removeAllListeners();
  }

  /**
   * returns promise returning WebXR system if available.
   * @return {Promise<XRSystem>}
   */
  static getXRSystem() {
    return new Promise((resolve, reject) => {
      if (!navigator || !navigator.xr) {
        const e = new Error('Browser not supporting WebXR');
        e.name = 'WEBXR_UNSUPPORTED';
        reject(e);
        return;
      }

      // 检查是否支持VR会话
      navigator.xr.isSessionSupported('immersive-vr')
        .then((supported) => {
          if (supported) {
            resolve(navigator.xr);
          } else {
            const e = new Error('No VR displays found');
            e.name = 'NO_DISPLAYS';
            reject(e);
          }
        })
        .catch((error) => {
          const e = new Error('WebXR check failed: ' + error.message);
          e.name = 'WEBXR_CHECK_FAILED';
          reject(e);
        });
    });
  }

  /**
   * 创建XR会话
   * @param {string} mode - 会话模式 ('immersive-vr', 'immersive-ar', 等)
   * @param {Object} options - 会话选项
   * @returns {Promise<XRSession>} XR会话
   */
  createSession(mode, options = {}) {
    if (!navigator.xr) {
      return Promise.reject(new Error('WebXR not supported'));
    }

    return navigator.xr.requestSession(mode, options);
  }

  /**
   * Enter presentation mode with your set XR display
   * @param {XRSystem} xrSystem - XR系统对象
   * @param {HTMLCanvasElement} canvas - 渲染使用的canvas
   * @return {Promise.<TResult>}
   */
  enterVR(xrSystem, canvas) {
    if (!xrSystem) {
      xrSystem = this.xrSystem;
    }

    this.presentedSource = canvas;
    
    // 获取Three.js的WebGLRenderer上下文
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return Promise.reject(new Error('WebGL context not available'));
    }
    
    // 配置XR会话
    const sessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor']
    };
    
    return xrSystem.requestSession('immersive-vr', sessionInit)
      .then((session) => {
        this.currentSession = session;
        
        // 添加会话结束事件监听器
        session.addEventListener('end', () => {
          this.currentSession = null;
          this.__setState(State.READY_TO_PRESENT);
        });
        
        // 创建WebGL兼容的XR层
        const xrGLLayer = new XRWebGLLayer(session, gl);
        session.updateRenderState({ baseLayer: xrGLLayer });
        
        return session;
      })
      .catch(() => {
        this.__setState(State.ERROR_REQUEST_TO_PRESENT_REJECTED);
        return Promise.reject(new Error('Failed to start XR session'));
      });
  }

  /**
   * Exit presentation mode on display
   * @param {XRSession} session - XR会话
   * @return {Promise.<TResult>}
   */
  exitVR(session) {
    if (!session && this.currentSession) {
      session = this.currentSession;
    }
    
    if (session) {
      return session.end()
        .then(() => {
          this.presentedSource = undefined;
          this.currentSession = null;
        })
        .catch(() => {
          this.__setState(State.ERROR_EXIT_PRESENT_REJECTED);
        });
    }
    
    return Promise.resolve();
  }

  /**
   * Enter fullscreen mode
   * @param {HTMLCanvasElement} canvas
   * @return {boolean}
   */
  enterFullscreen(canvas) {
    if (screenfull.enabled) {
      screenfull.request(canvas);
    } else {
      // iOS
      this.__setState(State.PRESENTING_FULLSCREEN);
    }
    return true;
  }

  /**
   * Exit fullscreen mode
   * @return {boolean}
   */
  exitFullscreen() {
    if (screenfull.enabled && screenfull.isFullscreen) {
      screenfull.exit();
    } else if (this.state == State.PRESENTING_FULLSCREEN) {
      this.checkDisplays();
    }
    return true;
  }

  /**
   * Change the state of the manager
   * @param {State} state
   * @private
   */
  __setState(state) {
    if (state != this.state) {
      this.emit('change', state, this.state);
      this.state = state;
    }
  }

  /**
   * Triggered on fullscreen change event
   * @param {Event} e
   * @private
   */
  __onChangeFullscreen(e) {
    if (screenfull.isFullscreen) {
      if (this.state != State.PRESENTING) {
        this.__setState(State.PRESENTING_FULLSCREEN);
      }
    } else {
      this.checkDisplays();
    }
  }

  /**
   * 获取默认显示设备
   * 兼容性方法，返回xrSystem对象
   */
  get defaultDisplay() {
    return this.xrSystem;
  }
}
