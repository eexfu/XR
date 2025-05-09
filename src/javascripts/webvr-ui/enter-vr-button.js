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
import WebXRManager from './webvr-manager';
import {createDefaultView} from './dom';
import State from './states';

/**
 * A button to allow easy-entry and messaging around a WebXR experience
 * 更新说明: 更新为使用WebXR API
 * @class
 */
export default class EnterXRButton extends EventEmitter {
  /**
   * Construct a new Enter XR Button
   * @constructor
   * @param {HTMLCanvasElement} sourceCanvas the canvas that you want to present in WebXR
   * @param {Object} [options] optional parameters
   * @param {HTMLElement} [options.domElement] provide your own domElement to bind to
   * @param {Boolean} [options.injectCSS=true] set to false if you want to write your own styles
   * @param {Function} [options.beforeEnter] should return a promise, opportunity to intercept request to enter
   * @param {Function} [options.beforeExit] should return a promise, opportunity to intercept request to exit
   * @param {Function} [options.onRequestStateChange] set to a function returning false to prevent default state changes
   * @param {string} [options.textEnterVRTitle] set the text for Enter VR
   * @param {string} [options.textVRNotFoundTitle] set the text for when a VR display is not found
   * @param {string} [options.textExitVRTitle] set the text for exiting VR
   * @param {string} [options.color] text and icon color
   * @param {string} [options.background] set to false for no brackground or a color
   * @param {string} [options.corners] set to 'round', 'square' or pixel value representing the corner radius
   * @param {string} [options.disabledOpacity] set opacity of button dom when disabled
   * @param {string} [options.cssprefix] set to change the css prefix from default 'webvr-ui'
   */
  constructor(sourceCanvas, options) {
    super();
    options = options || {};

    options.color = options.color || 'rgb(80,168,252)';
    options.background = options.background || false;
    options.disabledOpacity = options.disabledOpacity || 0.5;
    options.height = options.height || 55;
    options.corners = options.corners || 'square';
    options.cssprefix = options.cssprefix || 'webvr-ui';

    options.textEnterVRTitle = options.textEnterVRTitle || 'ENTER VR';
    options.textVRNotFoundTitle = options.textVRNotFoundTitle || 'VR NOT FOUND';
    options.textExitVRTitle = options.textExitVRTitle || 'EXIT VR';

    options.onRequestStateChange = options.onRequestStateChange || (() => true);
    options.beforeEnter = options.beforeEnter || (() => new Promise((resolve) => resolve()));
    options.beforeExit = options.beforeExit || (() => new Promise((resolve) => resolve()));

    options.injectCSS = options.injectCSS !== false;

    this.options = options;

    this.sourceCanvas = sourceCanvas;

    // Pass in your own domElement if you really dont want to use ours
    this.domElement = options.domElement || createDefaultView(options);
    this.__defaultDisplayStyle = this.domElement.style.display || 'initial';

    // Create WebXR Manager
    this.manager = new WebXRManager();
    this.manager.checkDisplays();
    this.manager.addListener('change', (state) => this.__onStateChange(state));

    // Bind button click events to __onClick
    this.domElement.addEventListener('click', () => this.__onEnterVRClick());

    this.__forceDisabled = false;
    this.setTitle(this.options.textEnterVRTitle);
  }

  /**
   * Set the title of the button
   * @param {string} text
   * @return {EnterXRButton}
   */
  setTitle(text) {
    this.domElement.title = text;
    ifChild(this.domElement, this.options.cssprefix, 'title', (title) => {
      if (!text) {
        title.style.display = 'none';
      } else {
        title.innerText = text;
        title.style.display = 'initial';
      }
    });

    return this;
  }

  /**
   * Set the tooltip of the button
   * @param {string} tooltip
   * @return {EnterXRButton}
   */
  setTooltip(tooltip) {
    this.domElement.title = tooltip;
    return this;
  }

  /**
   * Show the button
   * @return {EnterXRButton}
   */
  show() {
    this.domElement.style.display = this.__defaultDisplayStyle;
    this.emit('show');
    return this;
  }

  /**
   * Hide the button
   * @return {EnterXRButton}
   */
  hide() {
    this.domElement.style.display = 'none';
    this.emit('hide');
    return this;
  }

  /**
   * Enable the button
   * @return {EnterXRButton}
   */
  enable() {
    this.__setDisabledAttribute(false);
    this.__forceDisabled = false;
    return this;
  }

  /**
   * Disable the button from being clicked
   * @return {EnterXRButton}
   */
  disable() {
    this.__setDisabledAttribute(true);
    this.__forceDisabled = true;
    return this;
  }

  /**
   * clean up object for garbage collection
   */
  remove() {
    this.manager.remove();

    if (this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
  }

  /**
   * Returns a promise getting the XRSystem used
   * @return {Promise.<XRSystem>}
   */
  getXRSystem() {
    return WebXRManager.getXRSystem();
  }

  /**
   * Check if the canvas the button is connected to is currently presenting
   * @return {boolean}
   */
  isPresenting() {
    return this.state === State.PRESENTING || this.state == State.PRESENTING_FULLSCREEN;
  }

  /**
   * Request entering XR
   * @return {Promise}
   */
  requestEnterVR() {
    return new Promise((resolve, reject) => {
      if (this.options.onRequestStateChange(State.PRESENTING)) {
        return this.options.beforeEnter()
          .then(() => this.manager.enterVR(this.manager.xrSystem, this.sourceCanvas))
          .then(resolve);
      }
      reject(new Error(State.ERROR_REQUEST_STATE_CHANGE_REJECTED));
    });
  }

  /**
   * Request exiting presentation mode
   * @return {Promise}
   */
  requestExit() {
    const initialState = this.state;

    return new Promise((resolve, reject) => {
      if (this.options.onRequestStateChange(State.READY_TO_PRESENT)) {
        return this.options.beforeExit()
          .then(() =>
            // if we were presenting XR, exit XR, if we are
            // exiting fullscreen, exit fullscreen
            (initialState === State.PRESENTING
              ? this.manager.exitVR(this.manager.currentSession)
              : this.manager.exitFullscreen()))
          .then(resolve);
      }
      reject(new Error(State.ERROR_REQUEST_STATE_CHANGE_REJECTED));
    });
  }

  /**
   * Request entering the site in fullscreen, but not VR
   * @return {Promise}
   */
  requestEnterFullscreen() {
    return new Promise((resolve, reject) => {
      if (this.options.onRequestStateChange(State.PRESENTING_FULLSCREEN)) {
        return this.options.beforeEnter()
          .then(() => this.manager.enterFullscreen(this.sourceCanvas))
          .then(resolve);
      }
      reject(new Error(State.ERROR_REQUEST_STATE_CHANGE_REJECTED));
    });
  }

  /**
   * Set the disabled attribute
   * @param {boolean} disabled
   * @private
   */
  __setDisabledAttribute(disabled) {
    if (disabled || this.__forceDisabled) {
      this.domElement.setAttribute('disabled', 'true');
    } else {
      this.domElement.removeAttribute('disabled');
    }
  }

  /**
   * Handling click event from button
   * @private
   */
  __onEnterVRClick() {
    if (this.state == State.READY_TO_PRESENT) {
      this.requestEnterVR();
    } else if (this.isPresenting()) {
      this.requestExit();
    }
  }

  /**
   * @param {State} state the state that its transitioning to
   * @private
   */
  __onStateChange(state) {
    if (state != this.state) {
      if (this.state === State.PRESENTING || this.state === State.PRESENTING_FULLSCREEN) {
        this.emit('exit');
      }
      this.state = state;

      switch (state) {
        case State.READY_TO_PRESENT:
          this.show();
          this.setTitle(this.options.textEnterVRTitle);
          if (this.manager.xrSystem) {
            this.setTooltip(`Enter VR using WebXR`);
          }
          this.__setDisabledAttribute(false);
          this.emit('ready');
          break;

        case State.PRESENTING:
        case State.PRESENTING_FULLSCREEN:
          // 不再需要检查VR硬件是否为外部显示设备
          this.hide();
          this.setTitle(this.options.textExitVRTitle);
          this.__setDisabledAttribute(false);
          this.emit('enter');
          break;

        // Error states
        case State.ERROR_BROWSER_NOT_SUPPORTED:
          this.show();
          this.setTitle(this.options.textVRNotFoundTitle);
          this.setTooltip('Browser not supported');
          this.__setDisabledAttribute(true);
          this.emit('error', new Error(state));
          break;

        case State.ERROR_NO_PRESENTABLE_DISPLAYS:
          this.show();
          this.setTitle(this.options.textVRNotFoundTitle);
          this.setTooltip('No VR headset found.');
          this.__setDisabledAttribute(true);
          this.emit('error', new Error(state));
          break;

        case State.ERROR_REQUEST_TO_PRESENT_REJECTED:
          this.show();
          this.setTitle(this.options.textVRNotFoundTitle);
          this.setTooltip('Something went wrong trying to start presenting to your headset.');
          this.__setDisabledAttribute(true);
          this.emit('error', new Error(state));
          break;

        case State.ERROR_EXIT_PRESENT_REJECTED:
        default:
          this.show();
          this.setTitle(this.options.textVRNotFoundTitle);
          this.setTooltip('Unknown error.');
          this.__setDisabledAttribute(true);
          this.emit('error', new Error(state));
      }
    }
  }
}

/**
 * Function checking if a specific css class exists as child of element.
 *
 * @param {HTMLElement} el element to find child in
 * @param {string} cssPrefix css prefix of button
 * @param {string} suffix class name
 * @param {function} fn function to call if child is found
 * @private
 */
const ifChild = (el, cssPrefix, suffix, fn) => {
  const c = el.querySelector(`.${cssPrefix}-${suffix}`);
  c && fn(c);
};
