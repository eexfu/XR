# WebVR Manager 转 WebXR 更新

本目录包含从旧版WebVR API转换到现代WebXR API的代码。

## 主要更改内容

1. 将`navigator.getVRDisplays()` 更新为 `navigator.xr.requestSession()` 
2. 将`VRDisplay` 对象更新为 `XRSystem` 和 `XRSession` 对象
3. 更新事件监听器：
   - `vrdisplaypresentchange` -> `sessiongranted` 或 `end`
   - `vrdisplaydeviceparamschange` -> 不再需要，XRSession有自己的更新机制

## 文件更新

- `index.js` - 主要的WebVR管理器更新为WebXR管理器
- `button-manager.js` - 按钮管理器更新以处理WebXR会话
- `emitter.js` - 保持不变的事件发射器
- `modes.js` - 模式定义保持不变，但内部实现更新
- `util.js` - 实用工具函数更新，添加WebXR检测支持

## 兼容性

更新后的代码与Three.js v0.176.0版本兼容，使用现代WebXR API。 