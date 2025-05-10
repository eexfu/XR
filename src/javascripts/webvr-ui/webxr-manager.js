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
import State from './states';

/**
 * 简化版WebXR Manager用于处理XR显示
 */
export default class WebXRManager extends EventEmitter {
  /**
   * 构造一个新的WebXRManager
   */
  constructor() {
    super();
    this.state = State.PREPARING;
    this.mode = 'UNKNOWN';
    this.isVRCompatible = navigator.xr !== undefined;
  }

  /**
   * 检查浏览器是否兼容WebXR并有可用头显
   * @return {Promise}
   */
  checkDisplays() {
    return Promise.resolve();
  }

  /**
   * 静态方法：如果可用，返回WebXR系统
   * @return {Promise<XRSystem>}
   */
  static getXRSystem() {
    return Promise.resolve(navigator.xr || null);
  }
}
