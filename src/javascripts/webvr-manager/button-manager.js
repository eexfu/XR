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

import Emitter from './emitter.js';
import Modes from './modes.js';
import Util from './util.js';

/**
 * Everything having to do with the WebXR button.
 * Emits a 'click' event when it's clicked.
 * 更新说明: 将WebVR更新为WebXR
 */
function ButtonManager(opt_root) {
  const root = opt_root || document.body;
  this.loadIcons_();

  // Make the fullscreen button.
  const fsButton = this.createButton();
  fsButton.src = this.ICONS.fullscreen;
  fsButton.title = 'Fullscreen mode';
  fsButton.className += ' fullscreen-button';
  var s = fsButton.style;
  s.display = 'block';
  fsButton.addEventListener('click', this.createClickHandler_('fs'));
  root.appendChild(fsButton);
  this.fsButton = fsButton;

  // Make the VR button.
  const xrButton = this.createButton();
  xrButton.src = this.ICONS.cardboard;
  xrButton.title = 'Virtual reality mode';
  xrButton.className += ' vr-button';
  var s = xrButton.style;
  xrButton.addEventListener('click', this.createClickHandler_('vr'));
  root.appendChild(xrButton);
  this.xrButton = xrButton;

  this.isVisible = true;
}
ButtonManager.prototype = new Emitter();

ButtonManager.prototype.createButton = function() {
  const button = document.createElement('img');
  button.className = 'webvr-button';
  const s = button.style;

  // Prevent button from being selected and dragged.
  button.draggable = false;
  button.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  return button;
};

ButtonManager.prototype.setMode = function(mode, isVRCompatible) {
  isVRCompatible = isVRCompatible || WebXRConfig.FORCE_ENABLE_VR;
  if (!this.isVisible) {
    return;
  }
  switch (mode) {
    case Modes.NORMAL:
      this.fsButton.style.display = 'block';
      this.fsButton.src = this.ICONS.fullscreen;
      // 只有在XR兼容时才显示XR按钮
      this.xrButton.style.display = (isVRCompatible ? 'block' : 'none');
      break;
    case Modes.MAGIC_WINDOW:
      this.fsButton.style.display = 'block';
      console.log('setting exit fs');
      this.fsButton.src = this.ICONS.exitFullscreen;
      this.xrButton.style.display = 'none';
      break;
    case Modes.VR:
      this.fsButton.style.display = 'none';
      this.xrButton.style.display = 'none';
      break;
  }

  // Hack for Safari Mac/iOS to force relayout (svg-specific issue)
  // http://goo.gl/hjgR6r
  const oldValue = this.fsButton.style.display;
  this.fsButton.style.display = 'inline-block';
  this.fsButton.offsetHeight;
  this.fsButton.style.display = oldValue;
};

ButtonManager.prototype.setVisibility = function(isVisible) {
  this.isVisible = isVisible;
  this.fsButton.style.display = isVisible ? 'block' : 'none';
  this.xrButton.style.display = isVisible ? 'block' : 'none';
};

ButtonManager.prototype.createClickHandler_ = function(eventName) {
  return function(e) {
    e.stopPropagation();
    e.preventDefault();
    this.emit(eventName);
  }.bind(this);
};

ButtonManager.prototype.loadIcons_ = function() {
  // Preload some hard-coded SVG.
  this.ICONS = {};
  this.ICONS.cardboard = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMjAuNzQgNkgzLjIxQzIuNTUgNiAyIDYuNTcgMiA3LjI4djEwLjQ0YzAgLjcuNTUgMS4yOCAxLjIzIDEuMjhoNC43OWMuNTIgMCAuOTYtLjMzIDEuMTQtLjc5bDEuNC0zLjQ4Yy4yMy0uNTkuNzktMS4wMSAxLjQ0LTEuMDFzMS4yMS40MiAxLjQ1IDEuMDFsMS4zOSAzLjQ4Yy4xOS40Ni42My43OSAxLjExLjc5aDQuNzljLjcxIDAgMS4yNi0uNTcgMS4yNi0xLjI4VjcuMjhjMC0uNy0uNTUtMS4yOC0xLjI2LTEuMjh6TTcuNSAxNC42MmMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTMgMS4xOCAwIDIuMTIuOTYgMi4xMiAyLjEzcy0uOTUgMi4xMi0yLjEyIDIuMTJ6bTkgMGMtMS4xNyAwLTIuMTMtLjk1LTIuMTMtMi4xMiAwLTEuMTcuOTYtMi4xMyAyLjEzLTIuMTNzMi4xMi45NiAyLjEyIDIuMTMtLjk1IDIuMTItMi4xMiAyLjEyeiIvPgogICAgPHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgyNHYyNEgwVjB6Ii8+Cjwvc3ZnPgo=');
  this.ICONS.fullscreen = Util.base64('image/svg+xml', 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA1My4yIDUzLjIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUzLjIgNTMuMjsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnIGlkPSJMYXllcl8xIj48Zz48Zz4gPHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlPSJ3aGl0ZSIgcG9pbnRzPSIxNy44LDIuNSAyLjUsMi41IDIuNSwxNi45Ii8+IDwvZz48Zz4gPHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlPSJ3aGl0ZSIgcG9pbnRzPSIyLjUsMzYuMiAyLjUsNTAuNyAxNy44LDUwLjciLz4gPC9nPjxnPiA8cG9seWxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2U9IndoaXRlIiBwb2ludHM9IjM1LjMsNTAuNyA1MC43LDUwLjcgNTAuNywzNi4yIi8+IDwvZz48Zz4gPHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlPSJ3aGl0ZSIgcG9pbnRzPSI1MC43LDE2LjkgNTAuNywyLjUgMzUuMywyLjUiLz4gPC9nPjwvZz48L2c+PC9zdmc+');
  this.ICONS.exitFullscreen = Util.base64('image/svg+xml', 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48c3ZnIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA1MC4yIDUyLjgiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDUwLjIgNTIuODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPjxnIGlkPSJMYXllcl8xIj4gIDxnPiAgICA8Zz4gPHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlPSJ3aGl0ZSIgcG9pbnRzPSIxNS4zLDUyLjggMTUuMywzOC4zIDAsMzguMyIvPiA8L2c+ICAgIDxnPiA8cG9seWxpbmUgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2U9IndoaXRlIiBwb2ludHM9IjUwLjIsMzguMyAzNC44LDM4LjMgMzQuOCw1Mi44Ii8+IDwvZz4gICAgPGc+IDxwb2x5bGluZSBmaWxsPSJub25lIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZT0id2hpdGUiIHBvaW50cz0iMzQuOCwwIDM0LjgsMTQuNCA1MC4yLDE0LjQiLz4gPC9nPiAgICA8Zz4gPHBvbHlsaW5lIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlPSJ3aGl0ZSIgcG9pbnRzPSIwLDE0LjQgMTUuMywxNC40IDE1LjMsMCIvPiA8L2c+ICA8L2c+PC9nPjwvc3ZnPg==');
  this.ICONS.settings = Util.base64('image/svg+xml', 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNHB4IiBoZWlnaHQ9IjI0cHgiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRkZGRiI+CiAgICA8cGF0aCBkPSJNMCAwaDI0djI0SDB6IiBmaWxsPSJub25lIi8+CiAgICA8cGF0aCBkPSJNMTkuNDMgMTIuOThjLjA0LS4zMi4wNy0uNjQuMDctLjk4cy0uMDMtLjY2LS4wNy0uOThsMi4xMS0xLjY1Yy4xOS0uMTUuMjQtLjQyLjEyLS42NGwtMi0zLjQ2Yy0uMTItLjIyLS4zOS0uMy0uNjEtLjIybC0yLjQ5IDFjLS41Mi0uNC0xLjA4LS43My0xLjY5LS45OGwtLjM4LTIuNjVDMTQuNDYgMi4xOCAxNC4yNSAyIDE0IDJoLTRjLS4yNSAwLS40Ni4xOC0uNDkuNDJsLS4zOCAyLjY1Yy0uNjEuMjUtMS4xNy41OS0xLjY5Ljk4bC0yLjQ5LTFjLS4yMy0uMDktLjQ5IDAtLjYxLjIybC0yIDMuNDZjLS4xMy4yMi0uMDcuNDktLjEyLjY0bDIuMTEgMS42NWMtLjA0LjMyLS4wNy42NS0uMDcuOThzLjAzLjY2LjAzLjk4bC0yLjExIDEuNjVjLS4xOS4xNS0uMjQuNDItLjEyLjY0bDIgMy40NmMuMTIuMjIuMzkuMy42MS4yMmwyLjQ5IDFjLjUyLjQgMS4wOC43MyAxLjY5Ljg4bC4zOCAyLjY1Yy4wMy4yNC4yNC40Mi40OS40Mmg0Yy4yNSAwIC40Ni0uMTguNDktLjQybC4zOC0yLjY1Yy42MS0uMjUgMS4xNy0uNTkgMS42OS0uOThsMi40OSAxYy4yMy4wOS40OSAwIC42MS0uMjJsMi0zLjQ2Yy4xMi0uMjIuMDctLjQ5LS4xMi0uNjRsLTIuMTEtMS42NXoiLz4KPC9zdmc+Cg==');
};

// 全局WebXR配置，类似于原来的WebVRConfig
window.WebXRConfig = window.WebXRConfig || {
  FORCE_ENABLE_VR: false,
};

export default ButtonManager;
