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

/* global AFRAME */

import EnterXRButton from './enter-vr-button';
import State from './states';

if (typeof AFRAME !== 'undefined' && AFRAME) {
  AFRAME.registerComponent('webxr-ui', {
    dependencies: ['canvas'],

    schema: {
      enabled: {type: 'boolean', default: true},
      color: {type: 'string', default: 'white'},
      background: {type: 'string', default: 'black'},
      corners: {type: 'string', default: 'square'},
      disabledOpacity: {type: 'number', default: 0.5},

      textEnterVRTitle: {type: 'string'},
      textExitVRTitle: {type: 'string'},
      textVRNotFoundTitle: {type: 'string'},
    },

    init() {
    },

    update() {
      const scene = document.querySelector('a-scene');
      scene.setAttribute('vr-mode-ui', {enabled: !this.data.enabled});

      if (this.data.enabled) {
        if (this.enterXREl) {
          return;
        }

        const options = {
          color: this.data.color,
          background: this.data.background,
          corners: this.data.corners,
          disabledOpacity: this.data.disabledOpacity,
          textEnterVRTitle: this.data.textEnterVRTitle,
          textExitVRTitle: this.data.textExitVRTitle,
          textVRNotFoundTitle: this.data.textVRNotFoundTitle,
          onRequestStateChange(state) {
            if (state == State.PRESENTING) {
              scene.enterVR();
            } else {
              scene.exitVR();
            }
            return false;
          },
        };

        const enterXR = this.enterXR = new EnterXRButton(scene.canvas, options);

        this.enterXREl = enterXR.domElement;

        document.body.appendChild(enterXR.domElement);

        enterXR.domElement.style.position = 'absolute';
        enterXR.domElement.style.bottom = '10px';
        enterXR.domElement.style.left = '50%';
        enterXR.domElement.style.transform = 'translate(-50%, -50%)';
        enterXR.domElement.style.textAlign = 'center';
      } else if (this.enterXREl) {
        this.enterXREl.parentNode.removeChild(this.enterXREl);
        this.enterXR.remove();
      }
    },

    remove() {
      if (this.enterXREl) {
        this.enterXREl.parentNode.removeChild(this.enterXREl);
        this.enterXR.remove();
      }
    },
  });
  
  // 为了向后兼容，保留webvr-ui组件别名
  AFRAME.registerComponent('webvr-ui', {
    dependencies: ['webxr-ui'],
    
    init() {
      console.warn('webvr-ui 组件已弃用，请使用 webxr-ui 组件');
    }
  });
}
