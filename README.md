# WebVR 到 WebXR 迁移项目

## 项目概述

本项目将基于Three.js的WebVR应用程序更新为使用现代WebXR API。这次更新使项目与Three.js v0.176.0版本兼容，并确保在现代浏览器中的VR功能正常工作。

## 主要更新内容

### 1. Three.js组件更新
- 将 `VREffect.js` 更新为 `XRSessionHelper.js`
- 将 `VRControls.js` 更新为 `XRControls.js`
- 更新 `OBJLoader.js` 以兼容Three.js v0.176.0

### 2. WebVR API 更新为 WebXR API
- 将 `navigator.getVRDisplays()` 更改为 `navigator.xr.isSessionSupported()` 和 `navigator.xr.requestSession()`
- 使用现代 WebXR 事件处理机制，替换旧的VR事件
- 将 `VRDisplay` 对象更改为 `XRSystem` 和 `XRSession` 对象
- 更新为使用 `XRReferenceSpace` 和 `XRFrame` 进行位置追踪
- 为了兼容性，保留类似于旧API的接口封装

### 3. 管理器和UI组件更新
- 更新 `WebVRManager` 为 `WebXRManager`
- 更新 `EnterVRButton` 为 `EnterXRButton`
- 更新 A-Frame 集成组件 `webvr-ui` 为 `webxr-ui`
- 保持向后兼容性，允许使用旧的组件名称

### 4. 主应用程序适配
- 更新 `app.js` 和 `scene.js` 以使用新的WebXR组件
- 修改动画循环使用WebXR的RequestAnimationFrame
- 添加与设备兼容性检测和会话管理
- 保持与原有功能和用户体验一致

## 文件夹结构说明

- `/src/javascripts/three/` - 包含Three.js WebXR组件实现
- `/src/javascripts/webvr-manager/` - 包含XR会话管理
- `/src/javascripts/webvr-ui/` - 包含XR UI组件和按钮
- `/src/javascripts/` - 主应用程序代码

## 其他优化更新

除了API更新外，我们还添加了一些优化：
- 改进了几何体的内存管理，添加了dispose()调用
- 移除了过时的属性如geometry.dynamic
- 改进了透明度处理
- 使用了现代ES模块系统

## 跨平台兼容性

更新后的代码应该在以下环境中正常工作：
- Desktop VR (Oculus, HTC Vive, Windows Mixed Reality)
- Mobile VR (Oculus Quest, Google Cardboard等)
- 支持WebXR的现代浏览器 (Chrome, Firefox, Edge, Safari)