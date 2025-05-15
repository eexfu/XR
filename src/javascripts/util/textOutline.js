import { 
    ShapeGeometry, 
    LineSegments, 
    LineBasicMaterial, 
    BufferGeometry,
    Float32BufferAttribute,
    MeshBasicMaterial,
    Mesh,
    Group
  } from 'three';
  
  export function createTextOutline(text, font, {
    size = 0.4,
    color = 0xffffff
  } = {}) {
    // 获取文本形状
    const shapes = font.generateShapes(text, size);
    
    // 创建线框轮廓
    const geometry = new BufferGeometry();
    const vertices = [];
    const lineVertices = [];
    
    // 为每个形状创建轮廓顶点
    shapes.forEach(shape => {
      // 外轮廓
      extractPoints(shape.curves, lineVertices);
      
      // 内轮廓(孔洞)
      if (shape.holes && shape.holes.length > 0) {
        shape.holes.forEach(hole => {
          extractPoints(hole.curves, lineVertices);
        });
      }
    });
    
    // 创建线段几何体
    for (let i = 0; i < lineVertices.length; i += 2) {
      vertices.push(
        lineVertices[i].x, lineVertices[i].y, 0,
        lineVertices[i+1].x, lineVertices[i+1].y, 0
      );
    }
    
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    
    // 创建线框材质
    const material = new LineBasicMaterial({ 
      color: color, 
      transparent: true,
      depthTest: true,
      opacity: 1.0
    });
    
    const line = new LineSegments(geometry, material);
    
    // 计算边界盒以便定位
    const shapeGeometry = new ShapeGeometry(shapes);
    shapeGeometry.computeBoundingBox();
    line.userData.bbox = shapeGeometry.boundingBox;
    
    return line;
  }
  
  // 辅助函数：从曲线中提取线段顶点
  function extractPoints(curves, vertices) {
    curves.forEach(curve => {
      const points = curve.getPoints(10); // 10是细分数
      for (let i = 0; i < points.length - 1; i++) {
        vertices.push(points[i], points[i+1]);
      }
    });
  }
  
  // 或者还可以创建填充的文本
  export function createTextFilled(text, font, {
    size = 0.4,
    color = 0xffffff
  } = {}) {
    const shapes = font.generateShapes(text, size);
    const geometry = new ShapeGeometry(shapes);
    geometry.computeBoundingBox();
    
    const material = new MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new Mesh(geometry, material);
    mesh.userData.bbox = geometry.boundingBox;
    
    return mesh;
  }

// 修复函数中的边界盒部分
export function createTextWithOutline(text, font, {
    size = 0.4,
    fillColor = 0xffffff,
    outlineColor = 0xffffff,
    fillOpacity = 0.5,
    outlineOpacity = 1.0
  } = {}) {
    // 创建一个组来同时容纳填充和轮廓
    const group = new Group();
    // 创建填充部分
    const filled = createTextFilled(text, font, {
      size,
      color: fillColor
    });
    filled.material.opacity = fillOpacity;
    // 创建轮廓部分
    const outline = createTextOutline(text, font, {
      size,
      color: outlineColor
    });
    outline.material.opacity = outlineOpacity;
    // 将两者都添加到组中
    group.add(filled);
    group.add(outline);
    // 深度复制边界盒信息，而不是引用
    if (filled.userData.bbox) {
      try {
        group.userData = {
            bbox: {
              min: { 
                x: filled.userData.bbox.min.x,
                y: filled.userData.bbox.min.y,
                z: filled.userData.bbox.min.z
              },
              max: {
                x: filled.userData.bbox.max.x, 
                y: filled.userData.bbox.max.y,
                z: filled.userData.bbox.max.z
              }
            }
          };
      }
      catch(e) {
        console.error(e);
      }
    } else {
      console.warn('边界盒信息不存在于填充文本中');
    }
    return group;
  }