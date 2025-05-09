# WebVR UI 转 WebXR UI 更新

本目录包含将WebVR UI组件更新为WebXR API的代码。

## 主要更改内容

1. 将 VR 按钮组件更新为支持 WebXR API
2. 更新会话管理，使用 `navigator.xr` 代替 `navigator.getVRDisplays()`
3. 更新事件处理机制，使用 WebXR 事件
4. 保持 UI 设计和用户体验一致，但使用现代 API

## 文件更新

- `aframe-component.js` - 更新 A-Frame 组件以使用 WebXR
- `dom.js` - DOM 操作函数保持不变
- `enter-vr-button.js` - 主要的 VR 按钮组件更新为 XR 按钮
- `index.js` - 入口文件简单包装更新后的组件
- `states.js` - 状态定义保持一致，但内部逻辑更新
- `webvr-manager.js` - 更新为 WebXR 管理器

## 兼容性

更新后的代码与 Three.js v0.176.0 版本完全兼容，使用现代 WebXR API 接口。 