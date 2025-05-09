# Three.js 组件更新说明

这些文件已经被现代化改造，以与Three.js v0.176.0兼容。主要变更包括：

1. **WebVR 到 WebXR 的迁移**：
   - `VRControls.js` 已更新为 `XRControls`，使用现代WebXR API
   - `VREffect.js` 已更新为 `XRSessionHelper`，使用现代WebXR API

2. **模块化支持**：
   - 所有文件都已更新为使用ES模块导出（`export`），而不是CommonJS（`module.exports`）
   - 导入语句已更新为使用正确的类和函数

3. **API兼容性更新**：
   - `OBJLoader` 已更新以支持Three.js v0.176.0的API变更
   - 已移除已废弃的方法和属性
   - 添加了颜色支持和其他现代特性

4. **HUD组件更新**：
   - `TextGeometry` 已从主包移至 `three/addons/geometries/TextGeometry.js`
   - 几何体dispose方法已添加以防止内存泄漏
   - 移除了过时的属性如 `geometry.dynamic` 和 `geometry.verticesNeedUpdate`

5. **Models组件更新**：
   - 几何体API修改：不再支持直接修改`geometry.faces`
   - 所有几何体现在默认都是BufferGeometry
   - 移除了对旧版几何体API的依赖

请务必在更新Three.js版本时小心维护这些文件，并确保它们与使用它们的代码兼容。

## 注意事项

1. 使用TextGeometry需要确保正确配置了three/addons路径
2. 请确保您的构建系统(webpack等)正确处理这些导入路径
3. 所有几何体操作应该使用BufferGeometry API，不再支持直接操作faces
