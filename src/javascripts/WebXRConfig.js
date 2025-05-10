/**
 * WebXR 配置文件
 * 提供项目中使用的统一 WebXR 配置
 */

// WebXR 会话选项
const XR_SESSION_OPTIONS = {
  requiredFeatures: [],
  optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
};

// WebXR 渲染状态
const XR_RENDER_STATE = {
  depthNear: 0.1,
  depthFar: 1000
};

// WebXR 参考空间类型
const XR_REFERENCE_SPACE_TYPES = {
  LOCAL: 'local',
  LOCAL_FLOOR: 'local-floor',
  BOUNDED_FLOOR: 'bounded-floor',
  UNBOUNDED: 'unbounded'
};

// WebXR 特性集
const XR_FEATURES = {
  HAND_TRACKING: 'hand-tracking',
  HIT_TEST: 'hit-test',
  LOCAL_FLOOR: 'local-floor',
  BOUNDED_FLOOR: 'bounded-floor',
  UNBOUNDED: 'unbounded'
};

export {
  XR_SESSION_OPTIONS,
  XR_RENDER_STATE,
  XR_REFERENCE_SPACE_TYPES,
  XR_FEATURES
}; 