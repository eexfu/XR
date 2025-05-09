# 3D模型组件更新说明

为了与Three.js v0.176.0兼容，Models组件已进行了现代化改造。以下是主要变更：

## 主要变更

### 1. 几何体API更新
在Three.js v0.176.0中，所有几何体都是BufferGeometry，不再允许直接修改geometry.faces：
```javascript
// 旧版本 - 已弃用
geometry = new BoxGeometry(...);
delete geometry.faces[10];
geometry.faces = geometry.faces.filter(a => a !== undefined);

// 新版本
// 直接使用BoxGeometry，它已经是BufferGeometry
geometry = new BoxGeometry(...);
```

### 2. OBJLoader 使用
确保了与更新版本的OBJLoader兼容，依赖于three/OBJLoader.js的更新

## 文件修改内容

以下是每个文件的具体修改：

### table.js
- 移除了对geometry.faces的直接操作
- 添加BufferGeometry导入
- 添加注释说明API更改
- 使用标准几何体，不再尝试手动删除faces

### paddle.js
- 添加注释，确保使用更新版的OBJLoader
- 代码本身兼容，无需变更

### ball.js
- 添加注释说明兼容性
- 代码本身兼容，无需变更

### crosshair.js
- 添加注释说明兼容性
- 代码本身兼容，无需变更

### net.js
- 添加注释说明兼容性
- 代码本身兼容，无需变更

## 使用注意事项

1. **几何体使用**：所有几何体现在默认都是BufferGeometry，无需手动转换

2. **OBJLoader**：确保使用更新版本的OBJLoader（从three/addons/loaders/OBJLoader导入）

3. **性能优化**：BufferGeometry通常比旧版Geometry有更好的性能，所以这些更改应该能提高游戏性能

## 已解决的潜在问题

1. **table.js中的faces操作**：这在新版本Three.js中会引发错误，已通过使用标准几何体解决

2. **OBJLoader兼容性**：确保paddle.js使用了更新的OBJLoader版本 