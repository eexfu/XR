# WebVR 到 WebXR 更新总结

本项目已从旧版WebVR API更新为现代WebXR API，以兼容Three.js v0.176.0版本。

## 主要更新内容

### 1. WebVR Manager 更新

* `webvr-manager` 文件夹中的代码更新为使用 WebXR API
* `WebVRManager` 类更新为 `WebXRManager` 类
* 使用 `navigator.xr` 代替 `navigator.getVRDisplays()`
* 更新事件监听处理，使用 XR 会话事件
* 更改 renderer 配置方法以支持 WebXR

### 2. WebVR UI 组件更新

* `webvr-ui` 文件夹中的组件更新为支持 WebXR
* `EnterVRButton` 更新为 `EnterXRButton`
* A-Frame 组件 `webvr-ui` 更新为 `webxr-ui`（同时保留原组件做兼容）
* 更新按钮状态处理逻辑

### 3. 辅助文件和工具更新

* 创建了详细的 README 文件，说明更改内容
* 保持 DOM 操作和 CSS 生成工具不变
* 保持与旧版代码相同的使用模式，便于迁移

## 使用方法

```javascript
// 导入更新后的组件
import { EnterXRButton, WebXRManager } from './webvr-ui';

// 创建XR按钮
const xrButton = new EnterXRButton(canvas, options);

// 或使用WebXR管理器
const xrManager = new WebXRManager(renderer, effect, options);
```

## 向后兼容

为了保持向后兼容性，我们保留了旧类名的别名，但内部实现已全部更新为WebXR API。
旧代码在不做修改的情况下可以正常工作，但建议使用新的API命名。 