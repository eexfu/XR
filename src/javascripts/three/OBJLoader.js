/**
 * OBJLoader compatible with Three.js v0.176.0
 */

import {
  BufferAttribute,
  BufferGeometry,
  FileLoader,
  Group,
  Loader,
  Mesh,
  MeshPhongMaterial,
  Color,
  Points,
  PointsMaterial,
  Vector3,
  LineSegments,
  LineBasicMaterial
} from 'three';

// OBJLoader类定义
class OBJLoader extends Loader {
  constructor(manager) {
    super(manager);

    this.materials = null;
  }

  load(url, onLoad, onProgress, onError) {
    const scope = this;
    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);
    loader.load(url, function(text) {
      try {
        onLoad(scope.parse(text));
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          console.error(e);
        }

        scope.manager.itemError(url);
      }
    }, onProgress, onError);
  }

  setMaterials(materials) {
    this.materials = materials;
    return this;
  }

  parse(text) {
    const state = {
      objects: [],
      object: {},
      vertices: [],
      normals: [],
      colors: [],
      uvs: [],
      materials: {},
      materialLibraries: [],
      startObject: function(name, fromDeclaration) {
        // If the current object (initial from reset) is not from a g/o declaration in the parsed
        // file. We need to use it for the first parsed g/o to keep things in sync.
        if (this.object && this.object.fromDeclaration === false) {
          this.object.name = name;
          this.object.fromDeclaration = (fromDeclaration !== false);
          return;
        }

        const previousMaterial = (this.object && typeof this.object.currentMaterial === 'function' ? this.object.currentMaterial() : undefined);

        if (this.object && typeof this.object._finalize === 'function') {
          this.object._finalize(true);
        }

        this.object = {
          name: name || '',
          fromDeclaration: (fromDeclaration !== false),
          geometry: {
            vertices: [],
            normals: [],
            colors: [],
            uvs: []
          },
          materials: [],
          smooth: true,
          startMaterial: function(name, libraries) {
            const previous = this._finalize(false);

            // New usemtl declaration overwrites an inherited material, except if faces were declared
            // after the material, then it must be preserved for proper MultiMaterial continuation.
            if (previous && (previous.inherited || previous.groupCount <= 0)) {
              this.materials.splice(previous.index, 1);
            }

            const material = {
              index: this.materials.length,
              name: name || '',
              mtllib: (Array.isArray(libraries) && libraries.length > 0 ? libraries[libraries.length - 1] : ''),
              smooth: (previous !== undefined ? previous.smooth : this.smooth),
              groupStart: (previous !== undefined ? previous.groupEnd : 0),
              groupEnd: -1,
              groupCount: -1,
              inherited: false,
              clone: function(index) {
                const cloned = {
                  index: (typeof index === 'number' ? index : this.index),
                  name: this.name,
                  mtllib: this.mtllib,
                  smooth: this.smooth,
                  groupStart: 0,
                  groupEnd: -1,
                  groupCount: -1,
                  inherited: false
                };
                cloned.clone = this.clone.bind(cloned);
                return cloned;
              }
            };

            this.materials.push(material);

            return material;
          },
          currentMaterial: function() {
            if (this.materials.length > 0) {
              return this.materials[this.materials.length - 1];
            }
            return undefined;
          },
          _finalize: function(end) {
            const lastMultiMaterial = this.currentMaterial();
            if (lastMultiMaterial && lastMultiMaterial.groupEnd === -1) {
              lastMultiMaterial.groupEnd = this.geometry.vertices.length / 3;
              lastMultiMaterial.groupCount = lastMultiMaterial.groupEnd - lastMultiMaterial.groupStart;
              lastMultiMaterial.inherited = false;
            }

            // Ignore objects tail materials if no face declarations followed them before a new o/g started.
            if (end && this.materials.length > 1) {
              for (let mi = this.materials.length - 1; mi >= 0; mi--) {
                if (this.materials[mi].groupCount <= 0) {
                  this.materials.splice(mi, 1);
                }
              }
            }

            // Guarantee at least one empty material, this makes the creation later more straight forward.
            if (end && this.materials.length === 0) {
              this.materials.push({
                name: '',
                smooth: this.smooth
              });
            }

            return lastMultiMaterial;
          }
        };

        // Inherit previous objects material.
        // Spec tells us that a declared material must be set to all objects until a new material is declared.
        // If a usemtl declaration is encountered while this new object is being parsed, it will
        // overwrite the inherited material. Exception being that there was already face declarations
        // to the inherited material, then it will be preserved for proper MultiMaterial continuation.

        if (previousMaterial && previousMaterial.name && typeof previousMaterial.clone === 'function') {
          const declared = previousMaterial.clone(0);
          declared.inherited = true;
          this.object.materials.push(declared);
        }

        this.objects.push(this.object);
      },
      finalize: function() {
        if (this.object && typeof this.object._finalize === 'function') {
          this.object._finalize(true);
        }
      },
      parseVertexIndex: function(value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 3) * 3;
      },
      parseNormalIndex: function(value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 3) * 3;
      },
      parseUVIndex: function(value, len) {
        const index = parseInt(value, 10);
        return (index >= 0 ? index - 1 : index + len / 2) * 2;
      },
      addVertex: function(a, b, c) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;

        dst.push(src[a + 0], src[a + 1], src[a + 2]);
        dst.push(src[b + 0], src[b + 1], src[b + 2]);
        dst.push(src[c + 0], src[c + 1], src[c + 2]);
      },
      addVertexPoint: function(a) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;

        dst.push(src[a + 0], src[a + 1], src[a + 2]);
      },
      addVertexLine: function(a) {
        const src = this.vertices;
        const dst = this.object.geometry.vertices;

        dst.push(src[a + 0], src[a + 1], src[a + 2]);
      },
      addNormal: function(a, b, c) {
        const src = this.normals;
        const dst = this.object.geometry.normals;

        dst.push(src[a + 0], src[a + 1], src[a + 2]);
        dst.push(src[b + 0], src[b + 1], src[b + 2]);
        dst.push(src[c + 0], src[c + 1], src[c + 2]);
      },
      addColor: function(a, b, c) {
        const src = this.colors;
        const dst = this.object.geometry.colors;

        dst.push(src[a + 0], src[a + 1], src[a + 2]);
        dst.push(src[b + 0], src[b + 1], src[b + 2]);
        dst.push(src[c + 0], src[c + 1], src[c + 2]);
      },
      addUV: function(a, b, c) {
        const src = this.uvs;
        const dst = this.object.geometry.uvs;

        dst.push(src[a + 0], src[a + 1]);
        dst.push(src[b + 0], src[b + 1]);
        dst.push(src[c + 0], src[c + 1]);
      },
      addFace: function(a, b, c, ua, ub, uc, na, nb, nc, ca, cb, cc) {
        const vLen = this.vertices.length;

        let ia = this.parseVertexIndex(a, vLen);
        let ib = this.parseVertexIndex(b, vLen);
        let ic = this.parseVertexIndex(c, vLen);

        this.addVertex(ia, ib, ic);

        if (ca) {
          // colors
          const colorLen = this.colors.length;

          ca = this.parseVertexIndex(ca, colorLen);
          cb = this.parseVertexIndex(cb, colorLen);
          cc = this.parseVertexIndex(cc, colorLen);

          this.addColor(ca, cb, cc);
        }

        if (ua) {
          // uvs
          const uvLen = this.uvs.length;

          ua = this.parseUVIndex(ua, uvLen);
          ub = this.parseUVIndex(ub, uvLen);
          uc = this.parseUVIndex(uc, uvLen);

          this.addUV(ua, ub, uc);
        }

        if (na) {
          // normals
          const nLen = this.normals.length;

          na = this.parseNormalIndex(na, nLen);
          nb = this.parseNormalIndex(nb, nLen);
          nc = this.parseNormalIndex(nc, nLen);

          this.addNormal(na, nb, nc);
        }
      },
      addLineGeometry: function(vertices, uvs) {
        this.object.geometry.type = 'Line';

        const vLen = this.vertices.length;

        for (let vi = 0, l = vertices.length; vi < l; vi++) {
          this.addVertexLine(this.parseVertexIndex(vertices[vi], vLen));
        }

        if (uvs) {
          const uvLen = this.uvs.length;

          for (let uvi = 0, l = uvs.length; uvi < l; uvi++) {
            this.addUVLine(this.parseUVIndex(uvs[uvi], uvLen));
          }
        }
      }
    };

    // 正则表达式
    const regexp = {
      vertex_pattern: /^v\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
      normal_pattern: /^vn\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
      uv_pattern: /^vt\s+([\d|\.|\+|\-|e|E]+)\s+([\d|\.|\+|\-|e|E]+)/,
      face_vertex: /^f\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)(?:\s+(-?\d+))?/,
      face_vertex_uv: /^f\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+))?/,
      face_vertex_uv_normal: /^f\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)\s+(-?\d+)\/(-?\d+)\/(-?\d+)(?:\s+(-?\d+)\/(-?\d+)\/(-?\d+))?/,
      face_vertex_normal: /^f\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)\s+(-?\d+)\/\/(-?\d+)(?:\s+(-?\d+)\/\/(-?\d+))?/,
      object_pattern: /^[og]\s*(.+)?/,
      smoothing_pattern: /^s\s+(\d+|on|off)/,
      material_library_pattern: /^mtllib /,
      material_use_pattern: /^usemtl /
    };

    state.startObject('', false);

    // 解析OBJ文件内容
    const lines = text.split('\n');
    let line = '';
    let lineFirstChar = '';
    let lineLength = 0;
    let result = [];

    for (let i = 0, l = lines.length; i < l; i++) {
      line = lines[i].trim();
      lineLength = line.length;

      if (lineLength === 0) continue;

      lineFirstChar = line.charAt(0);

      // @todo: Handle lines with other prefixes such as "#"
      if (lineFirstChar === '#') continue;

      if (lineFirstChar === 'v') {
        const data = line.split(/\s+/);

        if (data[0] === 'v') {
          state.vertices.push(
            parseFloat(data[1]),
            parseFloat(data[2]),
            parseFloat(data[3])
          );

          if (data.length >= 7) {
            state.colors.push(
              parseFloat(data[4]),
              parseFloat(data[5]),
              parseFloat(data[6])
            );
          }
        } else if (data[0] === 'vn') {
          state.normals.push(
            parseFloat(data[1]),
            parseFloat(data[2]),
            parseFloat(data[3])
          );
        } else if (data[0] === 'vt') {
          state.uvs.push(
            parseFloat(data[1]),
            parseFloat(data[2])
          );
        }
      } else if (lineFirstChar === 'f') {
        const lineData = line.substr(1).trim();
        const vertexData = lineData.split(/\s+/);
        const faceVertices = [];

        // Parse the face vertex data into an easy to work with format
        for (let j = 0, jl = vertexData.length; j < jl; j++) {
          const vertex = vertexData[j];

          if (vertex.length > 0) {
            const vertexParts = vertex.split('/');
            faceVertices.push(vertexParts);
          }
        }

        // Draw an edge between the first vertex and all subsequent vertices
        const v1 = faceVertices[0];

        for (let j = 1, jl = faceVertices.length - 1; j < jl; j++) {
          const v2 = faceVertices[j];
          const v3 = faceVertices[j + 1];

          state.addFace(
            v1[0], v2[0], v3[0],
            v1[1], v2[1], v3[1],
            v1[2], v2[2], v3[2]
          );
        }
      } else if (lineFirstChar === 'l') {
        const lineParts = line.substring(1).trim().split(' ');
        let lineVertices = [];
        const lineUVs = [];

        if (line.indexOf('/') === -1) {
          lineVertices = lineParts;
        } else {
          for (let li = 0, llen = lineParts.length; li < llen; li++) {
            const parts = lineParts[li].split('/');

            if (parts[0] !== '') lineVertices.push(parts[0]);
            if (parts[1] !== '') lineUVs.push(parts[1]);
          }
        }
        state.addLineGeometry(lineVertices, lineUVs);
      } else if (lineFirstChar === 'p') {
        const lineData = line.substr(1).trim();
        const pointData = lineData.split(' ');

        state.addPointGeometry(pointData);
      } else if ((result = regexp.object_pattern.exec(line)) !== null) {
        const name = result[1].trim();
        state.startObject(name, true);
      } else if (regexp.material_use_pattern.test(line)) {
        state.object.startMaterial(line.substring(7).trim(), state.materialLibraries);
      } else if (regexp.material_library_pattern.test(line)) {
        state.materialLibraries.push(line.substring(7).trim());
      } else if (regexp.smoothing_pattern.exec(line) !== null) {
        // Smoothing groups are ignored
      } else if (line === '\0') {
        continue;
      } else if (line.length > 0) {
        console.warn('THREE.OBJLoader: Unexpected line: "' + line + '"');
      }
    }

    state.finalize();

    const container = new Group();
    container.materialLibraries = [].concat(state.materialLibraries);

    // 为每个对象创建网格
    for (let i = 0, l = state.objects.length; i < l; i++) {
      const object = state.objects[i];
      const geometry = object.geometry;
      const materials = object.materials;
      const isLine = (geometry.type === 'Line');
      const isPoint = (geometry.type === 'Points');
      let hasVertexColors = false;

      // Skip o/g line declarations that did not follow with any faces
      if (geometry.vertices.length === 0) continue;

      const buffergeometry = new BufferGeometry();

      buffergeometry.setAttribute('position', new BufferAttribute(new Float32Array(geometry.vertices), 3));

      if (geometry.normals.length > 0) {
        buffergeometry.setAttribute('normal', new BufferAttribute(new Float32Array(geometry.normals), 3));
      }

      if (geometry.colors.length > 0) {
        hasVertexColors = true;
        buffergeometry.setAttribute('color', new BufferAttribute(new Float32Array(geometry.colors), 3));
      }

      if (geometry.uvs.length > 0) {
        buffergeometry.setAttribute('uv', new BufferAttribute(new Float32Array(geometry.uvs), 2));
      }

      // Create materials
      const createdMaterials = [];

      for (let mi = 0, miLen = materials.length; mi < miLen; mi++) {
        const srcMaterial = materials[mi];
        const materialHash = srcMaterial.name + '_' + srcMaterial.smooth + '_' + hasVertexColors;
        let material = state.materials[materialHash];

        if (this.materials !== null) {
          material = this.materials.create(srcMaterial.name);

          // mtl etc. loaders probably can't create line materials correctly, copy properties to a line material.
          if (isLine && material && !(material instanceof LineBasicMaterial)) {
            const materialLine = new LineBasicMaterial();
            materialLine.copy(material);
            material = materialLine;
          } else if (isPoint && material && !(material instanceof PointsMaterial)) {
            const materialPoints = new PointsMaterial({ size: 10, sizeAttenuation: false });
            materialPoints.copy(material);
            material = materialPoints;
          }
        }

        if (!material) {
          if (isLine) {
            material = new LineBasicMaterial();
          } else if (isPoint) {
            material = new PointsMaterial({ size: 1, sizeAttenuation: false });
          } else {
            material = new MeshPhongMaterial();
          }

          material.name = srcMaterial.name;
        }

        material.flatShading = !srcMaterial.smooth;
        material.vertexColors = hasVertexColors;

        createdMaterials.push(material);
      }

      // Create mesh
      let mesh;

      if (createdMaterials.length > 1) {
        for (let mi = 0, miLen = materials.length; mi < miLen; mi++) {
          const srcMaterial = materials[mi];
          buffergeometry.addGroup(srcMaterial.groupStart, srcMaterial.groupCount, mi);
        }

        if (isLine) {
          mesh = new LineSegments(buffergeometry, createdMaterials);
        } else if (isPoint) {
          mesh = new Points(buffergeometry, createdMaterials);
        } else {
          mesh = new Mesh(buffergeometry, createdMaterials);
        }
      } else {
        if (isLine) {
          mesh = new LineSegments(buffergeometry, createdMaterials[0]);
        } else if (isPoint) {
          mesh = new Points(buffergeometry, createdMaterials[0]);
        } else {
          mesh = new Mesh(buffergeometry, createdMaterials[0]);
        }
      }

      mesh.name = object.name;
      container.add(mesh);
    }

    return container;
  }
}

export { OBJLoader };
