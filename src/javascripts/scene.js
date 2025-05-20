import {
  gsap,
  Power0,
  Power2,
  Power4,
  Expo,
} from 'gsap';
import $ from 'zepto-modules';
import FPS from 'fps';
import {
  Scene as ThreeScene,
  WebGLRenderer,
  TextureLoader,
  BasicShadowMap,
  SphereGeometry,
  PerspectiveCamera,
  DirectionalLight,
  AmbientLight,
  Raycaster,
  PlaneGeometry,
  Mesh,
  MeshBasicMaterial,
  Color,
  Vector3,
  Euler,
  CatmullRomCurve3,
  TubeGeometry,
  Texture,
  Matrix4,
  Line,
  LineBasicMaterial,
  BufferGeometry,
  Quaternion,
} from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import {
STATE, MODE, INITIAL_CONFIG, EVENT, CONTROLMODE
} from './constants';
import {
cap, mirrorPosition, mirrorVelocity, setTransparency
} from './util/helpers';
import Physics from './physics';
import Hud from './hud';
import SoundManager from './sound-manager';
import XRUtil from './xr-util';
import Time from './util/time';

import Table from './models/table';
import Net from './models/net';
import Ball from './models/ball';
import Crosshair from './models/crosshair';
import setupPaddles from './models/paddle';

const DEBUG_MODE = false;

/* global CannonDebugRenderer */

export default class Scene {
  constructor(emitter, communication) {
    this.emitter = emitter;
    this.communication = communication;
    this.config = { ...INITIAL_CONFIG};
    // for requestanimationframe-based timeouts and intervals
    this.time = new Time();
    this.sound = new SoundManager(this.config);
    this.score = {
      self: 0,
      opponent: 0,
      lives: this.config.startLives,
      highest: 0,
    };

    // THREE.JS
    // can be MOUSE or VR
    this.controlMode = CONTROLMODE.MOUSE;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    // three.js Controls
    this.controls = null;
    // three.js Effect
    this.effect = null;
    // VR display
    this.display = null;
    this.textureLoader = new TextureLoader();
    this.textureLoader.setPath('/textures/');
    this.objLoader = new OBJLoader();
    this.objLoader.setPath('/models/');
    // three.js meshes
    this.table = null;
    this.tablePlane = null;
    this.net = null;
    this.ball = null;
    this.crossHair = null;
    // vr manager
    this.manager = null;
    // three.js raycaster
    this.raycaster = null;

    // PHYSICS
    // when enabled, renders all cannon objects as wireframes
    this.physicsDebugRenderer = null;
    this.physicsTimeStep = 1000;
    this.physics = new Physics(this.config, this.emitter);

    // MULTIPLAYER
    // resetBallTimeout is used to reset the ball after it landed on the floor
    this.resetBallTimeout = null;
    // for determining whose point it is
    this.ballHasHitEnemyTable = false;
    // changes to 3000 in multiplayer mode, because it takes the ball longer to
    // travel to the other side of the table than just the folded table half
    this.resetTimeoutDuration = 1500;
    // used to coordinate restarts
    this.playerRequestedRestart = false;
    this.opponentRequestedRestart = false;
    // used to coordinate countdowns
    this.playerRequestedCountdown = false;
    this.opponentRequestedCountdown = false;
    // used to animate the ball from the position
    // where it should be to the position that was received over the wire
    this.ballInterpolationAlpha = 0;

    // ANIMATION
    // stores the last hit for the hit animation
    this.lastHitPosition = null;
    // used to animate a hit (the paddle quickly moves towards the ball and
    // back to the position it should be in according to the hmd
    this.paddleInterpolationAlpha = 0;
    // we need this also for the hit animation. always stores where the paddle
    // is according to the controls, so we can interpolate between that and the
    // hit position
    this.ghostPaddlePosition = new Vector3();
    // so the paddle doesn't repeatedly hit the ball during the animation
    this.hitAvailable = true;
    // for crazy mode
    this.hue = 0;
    this.datShitCray = false;

    // CONTROLS
    this.pointerIsLocked = false;
    // mouse moves for when the pointer is locked
    this.mouseMoveSinceLastFrame = {
      x: 0,
      y: 0,
    };
    // mouse position for when the pointer is not locked
    this.mousePosition = {
      x: 0,
      y: 0,
    };
    this.isMobile = XRUtil.isMobile();

    // store fps for reducing image quality if too low
    this.fps = FPS({
      every: 10,
      decay: 0.05,
    });
    // this number will be decremented as the quality is decreased if the fps are too low.
    // 4 = full quality
    // 3 = reduced shadow map size
    // 2 = no ball trail
    // 1 = no shadows
    // 0 = half pixel density
    this.quality = 4;
    // the trail causes the paddle to be janky on mobile devices for some reason.
    this.trailEnabled = true;
    // count the frames
    this.frameNumber = 0;
    // first frame after tab became active again, when tab is in background the
    // framerate drops so we have to ignore that in the fps counter
    this.firstActiveFrame = 0;
    // timestamp of when the scene was last rendered
    this.lastRenderTime = 0;
    // false if tab is switched, window hidden, app closed etc.
    this.tabActive = true;

    this.animate = this.animate.bind(this);
  }

  setup() {
    return new Promise((resolve) => {
      (async () => {
        try {
          // 1. 首先设置基础的 Three.js 组件
          this.setupThree();
          console.log('Three.js components initialized');

          // 2. 启用 WebXR
          if (this.renderer) {
            this.renderer.xr.enabled = true;
          } else {
            console.error("Renderer not initialized before attempting to enable XR.");
            resolve('error');
            return;
          }

          // 3. 设置网格
          this.net = Net(this.scene, this.config);

          // 4. 设置指针锁定
          this.renderer.domElement.requestPointerLock =
            this.renderer.domElement.requestPointerLock ||
            this.renderer.domElement.mozRequestPointerLock;

          this.renderer.domElement.onclick = () => {
            if (
              this.config.state !== STATE.GAME_OVER &&
              this.renderer.domElement.requestPointerLock
            ) {
              this.renderer.domElement.requestPointerLock();
            }
          };

          // 5. 设置物理世界
          this.physics.setupWorld();

          if (DEBUG_MODE) {
            this.physicsDebugRenderer = new CannonDebugRenderer(
              this.scene,
              this.physics.world
            );
          }

          // 6. 设置其他场景组件
          this.setupEventListeners();
          this.setupTablePlane();
          this.setupLights();
          this.setupEffects();

          // 7. 创建 HUD
          this.hud = new Hud(
            this.scene,
            this.config,
            this.emitter,
            this.objLoader
          );

          // 8. 创建准星
          try {
            console.log('Creating crosshair...');
            this.crosshair = Crosshair(this.scene, this.config);
            console.log('Crosshair created:', this.crosshair);
            this.crosshair.visible = false;
          } catch (error) {
            console.error('Error creating crosshair:', error);
          }

          // 9. 等待 HUD 设置和球拍设置完成
          const [{ paddle, paddleOpponent }] = await Promise.all([
            setupPaddles(this.objLoader, this.config, this.scene),
            this.hud.setup().then(() => {
              console.log('HUD setup complete, message:', this.hud.message);
              return null;
            })
          ]);

          // 10. 设置球拍位置
          this.paddle = paddle;
          this.paddleOpponent = paddleOpponent;
          this.paddle.position.copy(
            this.computePaddlePosition() || new Vector3()
          );
          this.ghostPaddlePosition.copy(this.paddle.position);

          // 11. 只有在所有组件都准备好后才开始动画循环
          if (this.renderer) {
            console.log('Starting animation loop');
            this.renderer.setAnimationLoop(this.animate);
          } else {
            console.error("Renderer not initialized before setAnimationLoop");
          }

          resolve('loaded');
        } catch (error) {
          console.error('Setup failed:', error);
          // 即使发生错误也要 resolve，这样应用程序仍然可以继续运行
          resolve('error');
        }
      })().catch(error => {
        console.error('Unexpected setup error:', error);
        resolve('error');
      });
    });
  }

  setupEventListeners() {
    this.emitter.on(EVENT.GAME_OVER, this.onGameOver.bind(this));
    this.emitter.on(EVENT.BALL_TABLE_COLLISION, this.onBallTableCollision.bind(this));
    this.emitter.on(EVENT.RESTART_BUTTON_PRESSED, this.onRestartButtonPressed.bind(this));
    this.emitter.on(EVENT.TOGGLE_RAINBOW_MODE, () => {
      if (this.datShitCray) {
        this.hud.message.buttons[this.config.rainbowText].setText(this.config.rainbowText);
        this.resetColors();
      } else {
        this.hud.message.buttons[this.config.rainbowText].setText('normal mode');
      }
      this.datShitCray = !this.datShitCray;
    });
    this.emitter.on(EVENT.EXIT_BUTTON_PRESSED, () => {
      if (this.renderer.xr.isPresenting) {
        this.renderer.xr.getSession().then(session => {
          session.end();
        });
      }
    });
    this.emitter.on(EVENT.BALL_NET_COLLISION, () => {
      this.sound.playUI('net');
    });

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    document.addEventListener('touchstart', e => {
      if (this.config.state !== STATE.GAME_OVER) {
        return;
      }
      // enable touch controls on mobile additionally to gaze controls
      const touchPos = {
        x: -2 * (0.5 - e.touches[0].clientX / this.viewport.width),
        y: 2 * (0.5 - e.touches[0].clientY / this.viewport.height),
      };
      this.raycaster.setFromCamera(touchPos, this.camera);
      this.hud.message.intersect(this.raycaster, true);
      this.hud.message.click();
    });
    $(this.renderer.domElement).click(() => {
      if (this.config.state !== STATE.GAME_OVER) {
        return;
      }
      console.log('click', this.config.state);
      this.hud.message.click();
    });

    if ('onpointerlockchange' in document) {
      document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
    } else if ('onmozpointerlockchange' in document) {
      document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this), false);
    }
    $(document).on('keydown', e => {
      if (e.keyCode === 82
        && (this.config.state === STATE.PLAYING
        || this.config.state === STATE.WAITING
        || this.config.state === STATE.COUNTDOWN
        || this.config.state === STATE.PAUSED
        || this.config.state === STATE.INSTRUCTIONS
        || this.config.state === STATE.GAME_OVER)) {
        this.emitter.emit(EVENT.TOGGLE_RAINBOW_MODE);
      }
    });
    $(window).on('resize', this.onResize.bind(this));
    $(window).on('vrdisplaypresentchange', this.onResize.bind(this));

    this.fps.on('data', framerate => {
      if (this.tabActive && this.frameNumber - this.firstActiveFrame > 60 * 5 && framerate < 50) {
        // allow the fps to recover for 5 seconds before further reducing quality
        this.firstActiveFrame = this.frameNumber;
        console.warn(`reducing quality to ${this.quality - 1}`);
        if (this.quality === 4) {
          this.light.shadow.mapSize.width = 512;
          this.light.shadow.mapSize.height = 512;
        } else if (this.quality === 3) {
          this.trailEnabled = false;
          this.scene.remove(this.trail);
        } else if (this.quality === 2) {
          this.light.castShadow = false;
          this.time.setTimeout(() => {
            // wait a little for the shadows to disappear before turning this
            // off, otherwise the shadow will be 'stuck' on the table
            this.renderer.shadowMap.enabled = false;
          }, 100);
        } else if (this.quality === 1) {
          if (XRUtil.isMobile() && !this.renderer.xr.isPresenting) {
            // doing this when in VR may break everything and turn it black
            this.renderer.setPixelRatio(window.devicePixelRatio / 2);
          }
        } else {
          return;
        }
        this.quality -= 1;
      }
    });
  }

  onBallPaddleCollision(point) {
    // the ball collided with the players paddle
    if (this.hitTween && this.hitTween.isActive()) {
      return;
    }
    this.physics.onBallPaddleCollision({body: this.physics.ball, target: this.paddle});
    this.ballHitAnimation();
    this.haloAnimation(point);
    this.ballPositionDifference = null;
    this.restartPingpongTimeout();
    this.ballHasHitEnemyTable = false;
    this.sound.paddle(point);
    if (this.config.mode === MODE.SINGLEPLAYER) {
      return;
    }
    this.slowdownBall();
    this.communication.sendHit({
      x: point.x,
      y: point.y,
      z: point.z,
    }, {
      x: this.physics.ball.velocity.x,
      y: this.physics.ball.velocity.y,
      z: this.physics.ball.velocity.z,
    });
  }

  onBallTableCollision(eventData) {
    const ballBody = eventData.body; // ball's physics body
    const tablePartHit = eventData.target; // the part of the table that was hit (physics body)
    const contactData = eventData.contact; // contact details

    this.sound.table(ballBody.position, this.physics.ball.velocity);

    if (tablePartHit._name === 'upwards-table' && this.config.mode === MODE.SINGLEPLAYER) {
      // 获取世界坐标系中的碰撞点
      const worldPoint = new Vector3();
      const contactPoint = contactData.bi.position.vadd(contactData.ri);
      worldPoint.copy(contactPoint);
      
      // 将世界坐标转换为目标平面的局部坐标
      const targetPlane = this.scene.getObjectByName('table-self-singleplayer');
      if (!targetPlane) {
        console.error('Target plane not found');
        return;
      }
      
      // 将世界坐标转换为目标平面的局部坐标
      const localPoint = worldPoint.clone();
      targetPlane.worldToLocal(localPoint);
      
      const contactNormalLocal = contactData.ni; // Normal in local coords of tablePartHit
      
      // 检查是否是正面击中（而不是擦边）
      const isFaceHit = Math.abs(contactNormalLocal.z) > 0.8; // Threshold, closer to 1 is more direct face hit
      
      // 计算击中点与目标中心的距离
      const targetVisualCenter = { x: 0, y: 0 };
      const distanceFromTargetCenter = Math.sqrt(
        Math.pow(localPoint.x - targetVisualCenter.x, 2) +
        Math.pow(localPoint.y - targetVisualCenter.y, 2)
      );
      
      // 计算目标区域半径
      const effectiveWallWidth = this.config.tableWidth;
      const effectiveWallHeight = this.config.tableHeight;
      // 将目标半径缩小一半
      const targetRadius = Math.sqrt((effectiveWallWidth * effectiveWallHeight) / (8 * Math.PI));
      
      // 判断是否击中目标区域
      const isWithinRadius = distanceFromTargetCenter < targetRadius;
      
      // 记录调试信息
      console.log('-- Wall Collision Details --');
      console.log('World Contact Point:', worldPoint);
      console.log('Local Contact Point:', localPoint);
      console.log('Is Face Hit:', isFaceHit);
      console.log('Distance from Target:', distanceFromTargetCenter.toFixed(3));
      console.log('Target Radius:', targetRadius.toFixed(3));
      console.log('Is Within Target:', isWithinRadius);
      
      // 1. 首先，无论如何都加分
      this.score.self += 1;
      this.hud.scoreDisplay.setSelfScore(this.score.self);
      
      // 2. 判断是否击中目标区域并正面击中
      if (isWithinRadius && isFaceHit) {
        console.log('✨ Target Hit! Processing life bonus...');
        // 只有击中目标区域才处理生命值
        this.handleTargetHit();
        this.sound.playUI('target_hit');
        
        // 显示击中目标的提示
        this.hud.message.setMessage('TARGET HIT!', 'antique');
        this.hud.message.showMessage();
        this.time.setTimeout(() => {
          this.hud.message.hideMessage();
        }, 800);
      } else {
        // 3. 如果只是击中了墙壁，播放普通音效
        console.log('Regular wall hit');
        // 使用已有的 table 音效替代 wall_hit
        const id = `table0${Math.floor(Math.random() * 3) + 1}`;
        this.sound.playUI(id);
        
        // 显示普通击中的提示
        this.hud.message.setMessage('+1', 'antique');
        this.hud.message.showMessage();
        this.time.setTimeout(() => {
          this.hud.message.hideMessage();
        }, 500);
      }
    }

    if (tablePartHit._name === 'table-2-player' && ballBody.position.z < this.config.tablePositionZ) {
      this.ballHasHitEnemyTable = true;
    }
  }

  handleTargetHit() {
    if (this.config.mode !== MODE.SINGLEPLAYER) return;

    console.log('Processing target hit bonus...');
    console.log('Current lives:', this.score.lives);
    console.log('Max lives:', this.config.startLives);

    // 只在生命值未满时处理
    if (this.score.lives < this.config.startLives) {
      this.score.lives += 1;
      this.hud.scoreDisplay.setLives(this.score.lives);
      console.log('Life gained! New lives:', this.score.lives);
      
      // 显示获得生命的提示消息
      const bonusMessage = this.score.lives === this.config.startLives ? 'MAX LIVES!' : 'LIFE +1!';
      this.hud.message.setMessage(bonusMessage, 'antique');
      this.hud.message.showMessage();
      this.time.setTimeout(() => {
        this.hud.message.hideMessage();
      }, 1000);
    }
  }

  onGameOver() {
    this.ballPath = null;
    this.sound.playLoop('bass-pad-synth');
    this.ball.visible = false;
    this.paddle.visible = false;
    this.paddleOpponent.visible = false;
    this.config.state = STATE.GAME_OVER;
    this.time.clearTimeout(this.resetBallTimeout);
    this.crosshair.visible = true;
    
    // 确保控制器射线和交互点在游戏结束时可见
    if (this.rayLine) {
      this.rayLine.visible = true;
      this.interactionPoint.visible = true;
    }
    
    if (this.config.mode === MODE.SINGLEPLAYER) {
      this.hud.message.gameOver(this.score);
      this.sound.playUI('win');
    } else {
      this.hud.message.gameOver(this.score);
      if (this.score.self > this.score.opponent) {
        this.sound.playUI('win');
      } else {
        this.sound.playUI('lose');
      }
    }
    // make it look like there is an overlay between the ui layer and the table
    this.showOverlay();
    this.hud.scoreDisplay.hide();
    this.hud.message.showMessage();
  }

  onRestartButtonPressed() {
    this.hud.message.hideMessage();
    if (this.config.mode === MODE.MULTIPLAYER) {
      this.playerRequestedRestart = true;
      this.hud.message.setMessage('waiting');
      this.hud.message.showMessage();
      this.communication.sendRestartGame();
    }
    this.restartGame();
  }

  onResize() {
    this.effect.setSize(window.innerWidth, window.innerHeight, true);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.viewport = {
      width: $(this.renderer.domElement).width(),
      height: $(this.renderer.domElement).height(),
    };
  }

  onMouseMove(e) {
    if (!this.paddle || !this.viewport) {
      return;
    }
    if (this.pointerIsLocked) {
      // mouse can move infinitely in all directions
      this.mouseMoveSinceLastFrame.x += e.movementX;
      this.mouseMoveSinceLastFrame.y += e.movementY;
    } else {
      // mouse is confined to viewport
      this.mousePosition.x = e.offsetX / this.viewport.width - 0.5;
      this.mousePosition.y = -(e.offsetY / this.viewport.height - 0.5);
    }
  }

  onPointerLockChange() {
    if (document.pointerLockElement === this.renderer.domElement
      || document.mozPointerLockElement === this.renderer.domElement) {
      this.pointerIsLocked = true;
    } else {
      this.pointerIsLocked = false;
    }
  }

  setupXRControls() {
    console.log('Setting up XR controls...');
  
    // 启用 XR
    if (this.renderer && !this.renderer.xr.enabled) {
      this.renderer.xr.enabled = true;
      console.log('XR enabled');
    }
  
    // 根据 handedness 选择控制器
    const handIndex = this.handedness === 'left' ? 0 : 1;
    const controller = this.renderer.xr.getController(handIndex);
    if (!controller) {
      console.warn('No controller found');
      return;
    }
  
    this.activeController = controller;
    this.scene.add(controller);
  
    // 射线线条
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0),
      new Vector3(0, 0, -1)
    ]);
    const lineMaterial = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5
    });
    this.rayLine = new Line(geometry, lineMaterial);
    this.rayLine.scale.z = 5;
  
    // 交互点
    const dotGeometry = new SphereGeometry(0.01, 32, 32);
    const dotMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    this.interactionPoint = new Mesh(dotGeometry, dotMaterial);
  
    controller.add(this.rayLine);
    controller.add(this.interactionPoint);
  
    // 控制器初始位置（connected 事件触发前设置默认）
    controller.position.set(0, this.config.tableHeight + 0.2, this.config.tablePositionZ);
  
    // 记录上一帧的位置
    let lastControllerPosition = new Vector3();
    let lastVerticalMoveDirection = 0;
    let lastHorizontalMoveDirection = 0;
  
    // 注册事件：selectstart
    controller.addEventListener('selectstart', () => {
      this.rayLine.material.opacity = 1.0;
      this.interactionPoint.material.opacity = 1.0;
  
      if (this.config.state === STATE.GAME_OVER && this.hud?.message?.click) {
        this.hud.message.click();
      }
    });
  
    // selectend 恢复透明度
    controller.addEventListener('selectend', () => {
      this.rayLine.material.opacity = 0.5;
      this.interactionPoint.material.opacity = 0.8;
    });
  
    // controller move 事件
    controller.addEventListener('move', (event) => {
      if (this.config.state === STATE.PLAYING && this.renderer.xr.isPresenting) {
        // 🎾 球拍位置同步
        if (this.paddle) {
          const controllerPosition = new Vector3();
          controller.getWorldPosition(controllerPosition);
  
          const verticalMoveDirection = controllerPosition.y - lastControllerPosition.y;
          const horizontalMoveDirection = controllerPosition.x - lastControllerPosition.x;
  
          lastVerticalMoveDirection = lastVerticalMoveDirection * 0.7 + verticalMoveDirection * 0.3;
          lastHorizontalMoveDirection = lastHorizontalMoveDirection * 0.7 + horizontalMoveDirection * 0.3;
  
          this.paddle._paddleMoveDirection = lastVerticalMoveDirection;
          this.paddle._paddleHorizontalMoveDirection = lastHorizontalMoveDirection;
  
          this.paddle.position.set(
            controllerPosition.x,
            Math.max(this.config.tableHeight + 0.2, controllerPosition.y),
            controllerPosition.z
          );
  
          lastControllerPosition.copy(controllerPosition);
        }
      }
  
      // ☄️ HUD 射线检测
      if (!this.hud || !this.hud.message) return;
  
      const tempMatrix = new Matrix4();
      tempMatrix.identity().extractRotation(controller.matrixWorld);
  
      const raycaster = new Raycaster();
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  
      const intersects = raycaster.intersectObjects(
        Object.values(this.hud.message.buttons).map(button => button.hitbox),
        false
      );
  
      if (intersects.length > 0) {
        const buttonName = intersects[0].object._name;
        if (this.hud.message.intersectedButton !== buttonName) {
          if (this.hud.message.intersectedButton) {
            this.hud.message.buttons[this.hud.message.intersectedButton].leave();
          }
          this.hud.message.intersectedButton = buttonName;
          this.hud.message.buttons[buttonName].enter();
        }
      } else if (this.hud.message.intersectedButton) {
        this.hud.message.buttons[this.hud.message.intersectedButton].leave();
        this.hud.message.intersectedButton = null;
      }
    });
  
    // connected: 初始化位置
    controller.addEventListener('connected', (event) => {
      console.log('Controller connected:', event);
      controller.position.set(0, this.config.tableHeight + 0.2, this.config.tablePositionZ);
      lastControllerPosition.copy(controller.position);
    });
  
    controller.addEventListener('disconnected', (event) => {
      console.log('Controller disconnected:', event);
    });
  }

  setupThree() {
    this.renderer = new WebGLRenderer({antialias: true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = BasicShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this.renderer.domElement);

    this.scene = new ThreeScene();
    this.camera = new PerspectiveCamera(47, window.innerWidth / window.innerHeight, 0.1, 10000);

    this.camera.position.x = 0;
    this.camera.position.y = 1.6;
    this.camera.position.z = 0.6;

    // 启用 XR
    this.renderer.xr.enabled = true;

    // 添加 VR 会话事件监听
    this.renderer.xr.addEventListener('sessionstart', () => {
      console.log('VR session started');
      this.controlMode = CONTROLMODE.VR;
      
      // 初始化控制器
      const controller = this.renderer.xr.getController(1);
      if (controller) {
        console.log('Adding controller to scene');
        this.scene.add(controller);
        
        // 添加控制器事件监听
        controller.addEventListener('selectstart', () => {
          console.log('Controller select event triggered');
          if (this.config.state === STATE.GAME_OVER) {
            this.hud.message.click();
          }
        });
        
        // 添加控制器移动事件监听
        controller.addEventListener('move', (event) => {
          console.log('Controller move event:', event);
          if (this.config.state === STATE.PLAYING && this.renderer.xr.isPresenting) {
            const controllerPosition = new Vector3();
            controller.getWorldPosition(controllerPosition);
            console.log('Controller position:', controllerPosition);
            
            if (this.paddle) {
              this.paddle.position.set(
                controllerPosition.x,
                Math.max(this.config.tableHeight + 0.2, controllerPosition.y),
                controllerPosition.z
              );
              console.log('Updated paddle position:', this.paddle.position);
            }
          }
        });
        
        // 添加控制器连接事件监听
        controller.addEventListener('connected', (event) => {
          console.log('Controller connected:', event);
        });
        
        // 添加控制器断开连接事件监听
        controller.addEventListener('disconnected', (event) => {
          console.log('Controller disconnected:', event);
        });
      } else {
        console.warn('No controller found during session start');
      }
      
      // 确保球拍可见
      if (this.paddle) {
        this.paddle.visible = true;
      }
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      console.log('VR session ended');
      this.controlMode = CONTROLMODE.MOUSE;
      
      // 重置相机位置
      this.camera.position.set(0, 1.6, 0.6);
      this.camera.rotation.set(0, 0, 0);
    });
  }

  setupLights() {
    this.light = new DirectionalLight(0xffffff, 0.3, 0);
    this.light.position.z = this.config.tablePositionZ;
    this.light.position.z = 2;
    this.light.position.y = 4;
    this.light.shadow.camera.near = 3.5;
    this.light.shadow.camera.far = 5.4;
    this.light.shadow.camera.left = -this.config.tableWidth / 2;
    this.light.shadow.camera.right = this.config.tableWidth / 2;
    this.light.shadow.camera.bottom = 0.8;
    this.light.shadow.camera.top = 3.4;
    this.light.castShadow = !this.isMobile;
    this.light.shadow.mapSize.width = (this.isMobile ? 1 : 8) * 512;
    this.light.shadow.mapSize.height = (this.isMobile ? 1 : 8) * 512;
    this.scene.add(this.light);

    this.scene.add(new AmbientLight(0xFFFFFF, 0.9));
  }

  setupTablePlane() {
    this.raycaster = new Raycaster();
    const geometry = new PlaneGeometry(40, 40, 5, 5);
    const material = new MeshBasicMaterial({color: 0xffff00, wireframe: true});
    this.tablePlane = new Mesh(geometry, material);
    this.tablePlane.rotation.x = -Math.PI * 0.45;
    this.tablePlane.position.y = this.config.tableHeight + 0.2;
    this.tablePlane.position.z = this.config.tablePositionZ + this.config.tableDepth / 2;
    // this.tablePlane.material.visible = false;
    this.tablePlane.visible = false;
    this.scene.add(this.tablePlane);
  }

  setupEffects() {
    let geometry = new SphereGeometry(0.3, 32, 32);
    let material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.halo = new Mesh(geometry, material);
    this.halo.position.z = 10;
    this.scene.add(this.halo);
    this.halo.scale.x = 0.001;
    this.halo.scale.y = 0.001;
    this.halo.scale.z = 0.001;

    this.ballPath = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, 0.1, 0)]);
    geometry = new TubeGeometry(this.ballPath, 30, 0.01, 8, false);

    if (this.trailEnabled) {
      // create a gradient texture on canvas and apply it on material
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, 200, 0);
      gradient.addColorStop(0, 'rgba(249, 252, 86, 0)');
      gradient.addColorStop(1, 'rgba(249, 252, 86, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      const trailTexture = new Texture(canvas);
      trailTexture.needsUpdate = true;

      material = new MeshBasicMaterial({
        map: trailTexture,
        transparent: true,
      });
      this.trail = new Mesh(geometry, material);
      this.scene.add(this.trail);
      this.ballPath = null;
    }
  }

  startGame() {
    console.log('startGame called');
    // prepare the scene
    this.hud.container.visible = false;
    const table1 = this.scene.getObjectByName('table-self');
    const table2 = this.scene.getObjectByName('table-opponent');
    console.log('controller Mode:', this.controlMode, 'config.mode:', this.config.mode);
    gsap.set('canvas', {
      visibility: 'visible',
    });
    if (this.config.mode === MODE.MULTIPLAYER) {
      if (this.communication.isHost) {
        this.renderer.setClearColor(this.config.colors.BLUE_CLEARCOLOR, 1);
        table1.material.color.set(this.config.colors.BLUE_TABLE);
        table2.material.color.set(this.config.colors.BLUE_TABLE);
      } else {
        this.renderer.setClearColor(this.config.colors.GREEN_CLEARCOLOR, 1);
        table1.material.color.set(this.config.colors.GREEN_TABLE);
        table2.material.color.set(this.config.colors.GREEN_TABLE);
      }
      this.net.getObjectByName('net').material.color.setHex(
        this.communication.isHost ? 0x1c1a54 : 0x194a51
      );
      this.showOverlay();
    } else {
      const upwardsTableGroup = this.scene.getObjectByName('upwardsTableGroup');
      upwardsTableGroup.visible = true;
      this.net.visible = false;
      this.physics.net.collisionResponse = 0;
      this.physics.upwardsTable.collisionResponse = 1;
      this.renderer.setClearColor(this.config.colors.PINK_CLEARCOLOR, 1);
      table1.material.color.set(this.config.colors.PINK_TABLE);
    }

    this.introPanAnimation().then(() => {
      console.log('introPanAnimation completed');
      this.viewport = {
        width: $(this.renderer.domElement).width(),
        height: $(this.renderer.domElement).height(),
      };
      if (XRUtil.isMobile()) {
        gsap.set('.reset-pose', {
          display: 'block',
        });
      }
      else {
        console.log('isMobile is false');
      }
      if (this.manager && this.manager.isVRCompatible) {
        gsap.set('.enter-vr', {
          display: 'block',
        });
      }
      else {
        console.log('isVRCompatible is false');
      }
      console.log('set paddle.visible');
      this.paddle.visible = true;
      this.hud.container.visible = true;
      // setupXRControls() 应该在场景设置早期被调用，以准备好控制器对象
      // VRButton进入会话后，控制器事件才会开始触发。
      // 如果之前没有调用，这里可以确保调用一次
      if(!this.scene.children.includes(this.renderer.xr.getController(1))) {
          this.setupXRControls(); 
          console.log('setupXRControls called from startGame');
      }
      console.log('setupXRControls completed');
      if (this.config.mode === MODE.SINGLEPLAYER) {
        console.log('Singleplayer mode, countdown');
        this.countdown();
      } else {
        console.log('Multiplayer mode, countdown');
        this.paddleOpponent.visible = true;
        this.playerRequestedCountdown = true;
        this.communication.sendRequestCountdown();
        this.requestCountdown();
        this.config.state = STATE.WAITING;
      }
    });
  }

  introPanAnimation() {
    if (this.display && 'requestAnimationFrame' in this.display && this.controlMode === CONTROLMODE.VR) {
      this.display.requestAnimationFrame(this.animate.bind(this));
    } else {
      requestAnimationFrame(this.animate.bind(this));
    }
    return new Promise(resolve => {
      const tl = new gsap.timeline();
      this.camera.lookAt(
        new Vector3().lerpVectors(
          this.ghostPaddlePosition,
          new Vector3(
            this.table.position.x,
            this.config.tableHeight + 0.3,
            this.table.position.z
          ),
          0.5
        )
      );
      tl.set(this.renderer.domElement, {display: 'block'});

      tl.to('.intro-wrapper', 0.3, {autoAlpha: 0});
      tl.call(resolve, [], null, '+=1');
    });
  }

  requestCountdown() {
    if (this.playerRequestedCountdown && this.opponentRequestedCountdown) {
      this.countdown();
    }
  }

  showInstructions() {
    return new Promise(resolve => {
      this.config.state = STATE.INSTRUCTIONS;
      if (this.config.state === STATE.GAME_OVER) {
        resolve();
        return;
      }
      if (this.config.mode === MODE.SINGLEPLAYER) {
        this.hud.message.setMessage('YOU HAVE\nFIVE LIVES', 'antique');
        this.time.setTimeout(resolve, 1500);
      } else {
        this.hud.message.setMessage('FIRST WITH\n11PTS WINS', 'antique');
        this.time.setTimeout(resolve, 2500);
      }
      this.hud.message.showMessage();
    });
  }

  countdown() {
    console.log('countdown called');
    if (this.config.state === STATE.COUNTDOWN || this.config.state === STATE.PLAYING) {
      return;
    }
    // TODO why is this neccessary
    $('.opponent-joined').css('display', 'none');
    this.paddle.visible = true;
    this.paddleOpponent.visible = this.config.mode === MODE.MULTIPLAYER;
    this.sound.playLoop('bass');
    this.hud.scoreDisplay.show();
    this.hideOverlay();

    // countdown from 3, start game afterwards
    let n = 4;
    this.showInstructions().then(() => {
      this.config.state = STATE.COUNTDOWN;
      this.hud.countdown.showCountdown();
      this.hud.message.hideMessage();
      const countdown = this.time.setInterval(() => {
        this.hud.countdown.setCountdown(n);
        n -= 1;
        if (n < 0) {
          // stop the countdown
          this.time.clearInterval(countdown);
          this.hud.countdown.hideCountdown();
          // start game by adding ball
          if (this.config.mode === MODE.SINGLEPLAYER) {
            console.log('addBall called from countdown');
            this.addBall();
            this.physics.initBallPosition();
          } else if (this.config.mode === MODE.MULTIPLAYER
              && !this.communication.isHost) {
            this.addBall();
            // if multiplayer, also send the other player a miss so the ball is synced
            this.communication.sendMiss({
              x: this.physics.ball.position.x,
              y: this.physics.ball.position.y,
              z: this.physics.ball.position.z,
            }, {
              x: this.physics.ball.velocity.x,
              y: this.physics.ball.velocity.y,
              z: this.physics.ball.velocity.z,
            }, true, true);
          }
        }
      }, 1000);
    });
  }

  restartGame() {
    this.crosshair.visible = false;
    this.physics.speed = 1;
    this.resetScore();
    if (this.config.mode === MODE.SINGLEPLAYER) {
      this.countdown();
      this.emitter.emit(EVENT.RESTART_GAME, this.score);
      return;
    }

    // only restart if both players requested it
    if (this.opponentRequestedRestart && this.playerRequestedRestart) {
      this.emitter.emit(EVENT.RESTART_GAME, this.score);
      // reset
      this.playerRequestedRestart = false;
      this.opponentRequestedRestart = false;
      this.countdown();
    }
  }

  resetScore() {
    this.score.self = 0;
    this.score.opponent = 0;
    this.score.highest = 0;
    this.score.lives = this.config.startLives;
    // propagate to HUD
    this.hud.scoreDisplay.setSelfScore(0);
    this.hud.scoreDisplay.setOpponentScore(0);
    this.hud.scoreDisplay.setLives(this.score.lives);
  }

  setMultiplayer() {
    // prepare multiplayer mode
    this.config.mode = MODE.MULTIPLAYER;
    this.scene.remove(this.table);
    this.table = Table(this.scene, this.config);
    this.hud.message.showMessage();
    this.resetTimeoutDuration = 2000;
    this.hud.scoreDisplay.opponentScore.visible = true;
    this.hud.scoreDisplay.lifeGroup.visible = false;
    this.net.getObjectByName('net-collider').visible = true;
    // add callbacks for received actions
    this.communication.setCallbacks({
      receivedMove: this.onReceivedMove.bind(this),
      receivedHit: this.onReceivedHit.bind(this),
      receivedMiss: this.onReceivedMiss.bind(this),
      receivedRestartGame: this.onReceivedRestartGame.bind(this),
      receivedRequestCountdown: this.onReceivedRequestCountdown.bind(this),
    });
  }

  setSingleplayer() {
    // prepare singleplayer mode
    this.config.mode = MODE.SINGLEPLAYER;
    this.scene.remove(this.table);
    this.table = Table(this.scene, this.config);
    this.resetTimeoutDuration = 1500;
    this.hud.scoreDisplay.opponentScore.visible = false;
    this.hud.scoreDisplay.lifeGroup.visible = true;
    this.scene.getObjectByName('net-collider').visible = false;
  }

  onReceivedMove(move) {
    // received a move from the opponent,
    // set his paddle to the position received
    const pos = mirrorPosition(move.position, this.config.tablePositionZ);
    const no = {
      x: this.paddleOpponent.position.x,
      y: this.paddleOpponent.position.y,
      z: this.paddleOpponent.position.z,
      rotationX: this.paddleOpponent.rotation.x,
      rotationY: this.paddleOpponent.rotation.y,
      rotationZ: this.paddleOpponent.rotation.z,
    };
    // show the opponent paddle slightly behind
    // the actual position to prevent the ball going
    // 'through' it
    gsap.to(no, {
      duration: 0.14,
      x: pos.x,
      y: pos.y,
      z: pos.z - 0.1,
      // eslint-disable-next-line
      rotationX: -move.rotation._x,
      // eslint-disable-next-line
      rotationY: move.rotation._y,
      // eslint-disable-next-line
      rotationZ: -move.rotation._z,
      onUpdate: () => {
        this.paddleOpponent.position.x = no.x;
        this.paddleOpponent.position.y = no.y;
        this.paddleOpponent.position.z = no.z;
        this.paddleOpponent.rotation.x = no.rotationX;
        this.paddleOpponent.rotation.y = no.rotationY;
        this.paddleOpponent.rotation.z = no.rotationZ;
      },
    });
  }

  onReceivedRestartGame() {
    this.opponentRequestedRestart = true;
    // try to restart game, only does if player also requested restart
    this.restartGame();
  }

  onReceivedHit(data, wasMiss = false) {
    this.time.clearTimeout(this.resetBallTimeout);
    // we might not have a ball yet
    if (!this.ball) {
      // this doesnt add a ball if it already exists so were safe to call it
      this.addBall();
    } else {
      this.sound.paddle(data.point);
    }
    if (!wasMiss) {
      this.haloAnimation(mirrorPosition(data.point, this.config.tablePositionZ));
      // the received position will sometimes be slightly off from the position
      // of this players ball due to changes in latency. save the difference and
      // interpolate it until the ball is at our side again. this way the user
      // shouldnt notice any hard position changes
      this.ballPositionDifference = new Vector3().subVectors(
        this.physics.ball.position,
        mirrorPosition(data.point, this.config.tablePositionZ)
      );
      this.ballInterpolationAlpha = 1;
      gsap.to(this, {
        duration: 0.5,
        ease: Power0.easeNone,
        ballInterpolationAlpha: 0,
      });
      this.physics.increaseSpeed();
    }
    this.physicsTimeStep = 1000;
    // received vectors are in the other users space
    // invert x and z velocity and mirror the point across the center of the table
    this.physics.ball.position.copy(mirrorPosition(data.point, this.config.tablePositionZ));
    this.physics.ball.velocity.copy(mirrorVelocity(data.velocity));
  }

  onReceivedMiss(data) {
    this.physics.speed = 1;
    this.ballPositionDifference = null;
    this.time.clearTimeout(this.resetBallTimeout);
    // opponent missed, update player score
    // and set game to be over if the score is high enough
    if (!data.isInit) {
      if (data.ballHasHitEnemyTable) {
        this.score.opponent += 1;
        this.tableBlinkAnimation('table-opponent');
        this.hud.scoreDisplay.setOpponentScore(this.score.opponent);
        this.sound.playUI('miss');
      } else {
        this.score.self += 1;
        this.tableBlinkAnimation('table-self');
        this.hud.scoreDisplay.setSelfScore(this.score.self);
        this.sound.playUI('point');
      }
    } else {
      this.addBall();
    }
    if (this.score.self >= this.config.POINTS_FOR_WIN
      || this.score.opponent >= this.config.POINTS_FOR_WIN) {
      this.emitter.emit(EVENT.GAME_OVER, this.score, this.config.mode);
    } else {
      this.physics.ball.angularVelocity.x = 0;
      this.physics.ball.angularVelocity.y = 0;
      this.physics.ball.angularVelocity.z = 0;
      // otherwise, the opponent that missed also resets the ball
      // and sends along its new position
      this.onReceivedHit(data, true);
      this.config.state = STATE.PLAYING;
    }
  }

  onReceivedRequestCountdown() {
    if (this.opponentRequestedCountdown) {
      return;
    }
    this.opponentRequestedCountdown = true;
    this.requestCountdown();
  }

  slowdownBall() {
    // if the ball is on the way to the opponent,
    // we slow it down so it will be on the opponents side
    // approximately at the time they actually hit it
    // NOTE that we still only receive the hit half a roundtriptime later
    if (this.physics.ball.velocity.z > 0) {
      return;
    }
    const velocity = this.physics.ball.velocity.length();
    const dist = new Vector3().subVectors(this.ball.position, this.paddleOpponent.position).length();
    const eta = dist / velocity;
    const desirableEta = eta + (this.communication.latency / 1000);
    this.physicsTimeStep = 1000 * (desirableEta / eta) * 1;
  }

  restartPingpongTimeout() {
    // reset the ball position in case the ball is stuck at the net
    // or fallen to the floor
    this.time.clearTimeout(this.resetBallTimeout);
    if (this.config.state === STATE.GAME_OVER) {
      return;
    }
    this.resetBallTimeout = this.time.setTimeout(this.resetTimeoutEnded.bind(this), this.resetTimeoutDuration);
  }

  resetTimeoutEnded() {
    this.ballPath = null;
    if (this.config.mode === MODE.MULTIPLAYER) {
      this.physicsTimeStep = 1000;
      if (this.ballHasHitEnemyTable) {
        this.score.self += 1;
        this.tableBlinkAnimation('table-self');
        this.hud.scoreDisplay.setSelfScore(this.score.self);
        this.sound.playUI('point');
      } else {
        this.score.opponent += 1;
        this.tableBlinkAnimation('table-opponent');
        this.hud.scoreDisplay.setOpponentScore(this.score.opponent);
        this.sound.playUI('miss');
      }
      if (this.score.opponent >= this.config.POINTS_FOR_WIN
          || this.score.self >= this.config.POINTS_FOR_WIN) {
        // game is over
        // TODO maybe wait a little with this so players can enjoy their 11 points
        this.emitter.emit(EVENT.GAME_OVER, this.score, this.config.mode);
      } else {
        // the game goes on
        this.physics.initBallPosition();
      }

      this.communication.sendMiss({
        x: this.physics.ball.position.x,
        y: this.physics.ball.position.y,
        z: this.physics.ball.position.z,
      }, {
        x: this.physics.ball.velocity.x,
        y: this.physics.ball.velocity.y,
        z: this.physics.ball.velocity.z,
      }, this.ballHasHitEnemyTable);
      this.ballHasHitEnemyTable = false;
    } else {
      // singleplayer
      this.score.highest = Math.max(this.score.self, this.score.highest);
      this.score.self = 0;
      this.hud.scoreDisplay.setSelfScore(this.score.self);
      this.physics.initBallPosition();
      this.score.lives -= 1;
      this.hud.scoreDisplay.setLives(this.score.lives);
      this.sound.playUI('miss');
      if (this.score.lives === 1) {
        this.hud.message.setMessage('LAST LIFE!', 'antique');
        this.hud.message.showMessage();
        this.time.setTimeout(() => {this.hud.message.hideMessage();}, 1500);
      }
      if (this.score.lives < 1) {
        this.emitter.emit(EVENT.GAME_OVER, this.score, this.config.mode);
      }
    }
    this.restartPingpongTimeout();
  }

  showOverlay() {
    setTransparency(this.table, 0.2);
    setTransparency(this.net.topNet, 0.2);
    this.net.collider.visible = false;
  }

  hideOverlay() {
    setTransparency(this.table, 1);
    setTransparency(this.net.topNet, 1);
    this.net.collider.visible = true;
  }

  resetPose() {
    if (this.renderer.xr.isPresenting) {
      // 在XR模式下重置姿态
      this.renderer.xr.getSession().then(session => {
        if (session && session.requestReferenceSpace) {
          session.requestReferenceSpace('local').then(referenceSpace => {
            // 使用参考空间重置姿态
            if (referenceSpace) {
              // 重置相机位置
              this.camera.position.set(0, 1.6, 0.6);
              this.camera.rotation.set(0, 0, 0);
            }
          });
        }
      });
    }
  }

  addBall() {
    console.log('addBall called, state before:', this.config.state);
    this.config.state = STATE.PLAYING;
    console.log('addBall called, state after:', this.config.state);
    if (this.ball) {
      this.ball.visible = true;
      this.physics.initBallPosition();
      this.restartPingpongTimeout();
      return;
    }
    this.ball = new Ball(this.scene, this.config);
    this.physics.addBall();
    this.restartPingpongTimeout();
  }

  updateControls() {
    const pos = this.computePaddlePosition();
    if (pos) {
      this.ghostPaddlePosition.copy(pos);
    }
    if (this.hitTween && this.hitTween.isActive()) {
      // interpolate between ball and paddle position during hit animation
      const newPos = new Vector3().lerpVectors(
        pos,
        this.lastHitPosition,
        this.paddleInterpolationAlpha
      );
      this.paddle.position.copy(newPos);
    } else if (pos) {
      this.paddle.position.copy(pos);
    }
    // VR模式下让球拍的朝向跟随手柄，并补偿旋转让拍面垂直于地面
    if (this.renderer.xr.isPresenting && this.activeController) {
      this.paddle.quaternion.copy(this.activeController.quaternion);
      // 补偿：绕X轴-90度
      const fix = new Quaternion();
      fix.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
      this.paddle.quaternion.multiply(fix);
    } else {
      const rotation = this.computePaddleRotation(this.paddle.position);
      this.paddle.rotation.x = rotation.x;
      this.paddle.rotation.z = rotation.z;
    }
    this.updateCamera();
  }

  updateCamera() {
    if (this.renderer.xr.isPresenting) {
      // user controls camera with headset in vr mode
      return;
    }
    // backup original rotation
    const startRotation = new Euler().copy(this.camera.rotation);

    // look at the point at the middle position between the table center and paddle
    this.camera.lookAt(
      new Vector3().lerpVectors(
        this.ghostPaddlePosition,
        new Vector3(
          this.table.position.x,
          this.config.tableHeight + 0.3,
          this.table.position.z
        ),
        0.5
      )
    );
    // the rotation we want to end up with
    const endRotation = new Euler().copy(this.camera.rotation);
    // revert to original rotation and then we can tween it
    this.camera.rotation.copy(startRotation);
    if (this.cameraTween) {
      this.cameraTween.kill();
    }
    this.cameraTween = gsap.to(this.camera.rotation, {
      duration: 0.5,
      x: endRotation.x,
      y: endRotation.y,
      z: endRotation.z,
      ease: Power4.easeOut,
    });
  }

  computePaddlePosition() {
    let paddlePositionVec = new Vector3();
    if (this.renderer.xr.isPresenting) {
      const controller = this.activeController;
      if (controller) {
        const controllerPosition = new Vector3();
        controller.getWorldPosition(controllerPosition);
        
        // 直接使用手柄位置，允许在3D空间中自由移动
        paddlePositionVec.copy(controllerPosition);
        
        // 只限制水平方向的移动范围，允许在z轴和y轴上自由移动
        paddlePositionVec.x = cap(paddlePositionVec.x, this.config.tableWidth / 2, -this.config.tableWidth / 2);
        
        console.log('Controller Position:', controllerPosition);
        console.log('Paddle Position:', paddlePositionVec);
      }
    } else if (this.pointerIsLocked) {
      paddlePositionVec.set(
        this.ghostPaddlePosition.x + 0.0015 * this.mouseMoveSinceLastFrame.x,
        this.config.tableHeight + 0.24,
        this.ghostPaddlePosition.z + 0.0015 * this.mouseMoveSinceLastFrame.y
      );
    } else {
      paddlePositionVec.set(
        1.4 * this.mousePosition.x * this.config.tableWidth,
        this.config.tableHeight + 0.24,
        -this.config.tableDepth * 0.5 * (this.mousePosition.y + 0.5)
      );
    }
    return paddlePositionVec;
  }

  computePaddleRotation(pos) {
    return {
      x: -((this.config.tablePositionZ + this.config.tableDepth / 2) - pos.z * 1),
      y: 0,
      z: cap(-pos.x, -Math.PI / 2, Math.PI / 2),
    };
  }

  updateBall() {
    if (this.ballPositionDifference) {
      // we interpolate between the actual (received) position and the position
      // the user would expect. after 500ms both positions are the same.
      const fauxPosition = new Vector3().lerpVectors(
        this.physics.ball.position,
        new Vector3().addVectors(
          this.physics.ball.position,
          this.ballPositionDifference
        ),
        this.ballInterpolationAlpha
      );
      this.ball.position.copy(fauxPosition);
      this.ball.quaternion.copy(this.physics.ball.quaternion);
    } else {
      this.ball.position.copy(this.physics.ball.position);
      this.ball.quaternion.copy(this.physics.ball.quaternion);
    }
  }

  ballHitAnimation() {
    if (!(this.hitTween && this.hitTween.isActive()) && this.hitAvailable) {
      this.hitAvailable = false;
      this.hitTween = new gsap.timeline({
        onComplete: () => {this.hitAvailable = true;},
      });
      this.lastHitPosition = this.ball.position.clone();
      this.lastHitPosition.y = Math.max(this.lastHitPosition.y, this.config.tableHeight + 0.2);
      this.hitTween.to(this, 0.05, {
        paddleInterpolationAlpha: 1,
        ease: Power2.easeIn,
      });
      this.hitTween.to(this, 0.4, {
        ease: Power2.easeOut,
        paddleInterpolationAlpha: 0,
      });
    }
  }

  haloAnimation(position) {
    this.halo.position.copy(position);
    gsap.fromTo(this.halo.material, {
      opacity: 0.2,
    }, {
      duration: 1,
      opacity: 0,
    });
    gsap.fromTo(this.halo.scale, {
      x: 0.001,
      y: 0.001,
      z: 0.001,
    }, {
      duration: 1,
      x: 1,
      y: 1,
      z: 1,
      ease: Expo.easeOut,
    });
  }

  tableBlinkAnimation(side) {
    const table = this.scene.getObjectByName(side);
    if (!table) return;
    const brightenedColor = `#${table.material.color.clone().lerp(new Color(0xffffff), 0.5).getHexString()}`;
    const no = {
      color: `#${table.material.color.getHexString()}`,
    };
    const BLUE_TABLE = `#${new Color(this.config.colors.BLUE_TABLE).getHexString()}`;
    const GREEN_TABLE = `#${new Color(this.config.colors.GREEN_TABLE).getHexString()}`;
    const to = this.communication.isHost ? BLUE_TABLE : GREEN_TABLE;
    gsap.fromTo(no, {
      color: brightenedColor,
    }, {
      duration: 0.8,
      color: to,
      ease: Power4.easeOut,
      onUpdate: () => {
        table.material.color.set(no.color);
      },
    });
  }

  resetColors() {
    const singleplayerTable = this.table.getObjectByName('table-self-singleplayer');
    const opponentTable = this.table.getObjectByName('table-opponent');
    if (this.config.mode === MODE.SINGLEPLAYER) {
      this.table.getObjectByName('table-self').material.color.set(this.config.colors.PINK_TABLE);
      singleplayerTable.material.color.set(this.config.colors.PINK_TABLE_UPWARDS);
      this.renderer.setClearColor(this.config.colors.PINK_CLEARCOLOR);
    } else if (this.communication.isHost) {
      this.table.getObjectByName('table-self').material.color.set(this.config.colors.BLUE_TABLE);
      opponentTable.material.color.set(this.config.colors.BLUE_TABLE);
      this.renderer.setClearColor(this.config.colors.BLUE_CLEARCOLOR);
    } else {
      this.table.getObjectByName('table-self').material.color.set(this.config.colors.GREEN_TABLE);
      opponentTable.material.color.set(this.config.colors.GREEN_TABLE);
      this.renderer.setClearColor(this.config.colors.GREEN_CLEARCOLOR);
    }
    this.paddle.getObjectByName('Cap_1').material.color.set(this.config.colors.PADDLE_COLOR);
    this.paddle.getObjectByName('Cap_2').material.color.set(this.config.colors.PADDLE_COLOR);
    if (this.ball) {
      this.ball.material.color.set(this.config.colors.BALL);
    }
  }

  updateHudControls() {
    // raycaster wants mouse from -1 to 1, not -0.5 to 0.5 like mousePosition is normalized
    let mouse = {};
    if (this.controlMode === CONTROLMODE.VR || this.isMobile) {
      const zCamVec = new Vector3(0, 0, -1);
      const position = this.camera.localToWorld(zCamVec);
      this.crosshair.position.set(position.x, position.y, position.z);
      if (position.z > 1) {
        this.crosshair.visible = true;
      } else {
        this.crosshair.visible = this.config.state === STATE.GAME_OVER;
      }
      mouse = {
        x: 0,
        y: 0,
      };
    } else {
      mouse = {
        x: this.mousePosition.x * 2,
        y: this.mousePosition.y * 2,
      };
    }
    this.raycaster.setFromCamera(mouse, this.camera);
    this.raycaster.far = 400;
    // 添加防御性检查
    if (!this.hud || !this.hud.message) {
      console.warn('hud/message 未初始化，无法在updateHudControls中执行');
      return;
    }
    this.hud.message.intersect(this.raycaster, this.controlMode === CONTROLMODE.MOUSE && !this.isMobile);
  }

  updateTrail() {
    if (!this.trailEnabled) {
      return;
    }
    // the points array is a first in first out queue
    if (!this.ballPath) {
      this.ballPath = new CatmullRomCurve3([
        this.ball.position.clone(),
        new Vector3(
          this.ball.position.x,
          this.ball.position.y,
          this.ball.position.z + 0.001
        ),
      ]);
    } else {
      this.ballPath.points.push(this.ball.position.clone());
    }
    if (this.ballPath.points.length > 20) {
      this.ballPath.points.shift();
    }
    this.trail.geometry.dispose();
    this.trail.geometry = new TubeGeometry(this.ballPath, 8, 0.01, 8, false);
  }

  animate(timestamp, frame) {
    // 基础组件检查
    if (!this.renderer || !this.scene || !this.camera) {
      console.warn('基础组件未初始化，无法在animate中执行');
      return;
    }

    // HUD 组件检查
    if (!this.hud || !this.hud.message) {
      console.warn('HUD/message 未初始化，等待初始化完成');
      return;
    }
    
    // 计算 delta time
    const delta = (timestamp - (this.lastRenderTime || timestamp)) / 1000.0;
    this.lastRenderTime = timestamp;

    this.fps.tick();

    // 在 VR 模式下更新球拍位置
    if (this.renderer.xr.isPresenting && this.controlMode === CONTROLMODE.VR) {
      const controller = this.activeController;
      if (controller && this.paddle) {
        const controllerPosition = new Vector3();
        controller.getWorldPosition(controllerPosition);
        
        // 直接使用控制器位置，允许在3D空间中自由移动
        this.paddle.position.copy(controllerPosition);
        
        // 只限制水平方向的移动范围
        this.paddle.position.x = cap(this.paddle.position.x, this.config.tableWidth / 2, -this.config.tableWidth / 2);
        
        console.log('Frame update - Controller position:', controllerPosition);
        console.log('Frame update - Paddle position:', this.paddle.position);
      }
    }

    // 球和球拍碰撞检测
    if (this.ball) {
      const dist = new Vector3();
      dist.subVectors(this.ball.position, this.paddle.position);
      let ballMovingTowardsPlayer = false;
      
      if (this.renderer.xr.isPresenting && frame) {
        const cameraDirection = new Vector3();
        this.camera.getWorldDirection(cameraDirection);
        ballMovingTowardsPlayer = this.physics.ball.velocity.z * (this.ball.position.z > this.paddle.position.z ? -1 : 1) > 0;
      } else {
        ballMovingTowardsPlayer = this.physics.ball.velocity.z > 0;
      }

      if (
        (dist.length() < 0.4 && Math.abs(dist.x) < 0.2 && Math.abs(dist.z) < 0.1 ||
         this.isMobile && dist.length() < 0.4 && Math.abs(dist.x) < 0.3 && Math.abs(dist.z) < 0.1) &&
        ballMovingTowardsPlayer 
      ) {
        this.onBallPaddleCollision(this.ball.position);
      }
      this.updateTrail();
    }

    // 更新游戏状态
    if (this.config.state === STATE.PLAYING ||
        this.config.state === STATE.WAITING ||
        this.config.state === STATE.COUNTDOWN ||
        this.config.state === STATE.PAUSED ||
        this.config.state === STATE.INSTRUCTIONS ||
        this.config.state === STATE.GAME_OVER) {
      
      this.updateControls();
      
      if (this.config.mode === MODE.MULTIPLAYER && this.config.state !== STATE.WAITING) {
        if (this.frameNumber % 5 === 0) {
          this.communication.sendMove(
            this.paddle.position,
            this.paddle.rotation
          );
        }
      }
    }

    // 更新物理
    if (this.config.state === STATE.PLAYING && this.tabActive) {
      this.physics.step(delta / (this.physicsTimeStep / 1000.0));
      this.updateBall();
      this.physics.predictCollisions(this.scene.getObjectByName('net-collider'), delta);
    }

    this.updateHudControls();

    if (DEBUG_MODE && this.physicsDebugRenderer) {
      this.physicsDebugRenderer.update();
    }

    if (this.tabActive && this.config.state !== STATE.PAUSED) {
      this.time.step();
    }

    // 更新视觉效果
    if (this.datShitCray) {
      this.updateCrazyMode(delta);
    }

    this.frameNumber += 1;
    this.mouseMoveSinceLastFrame.x = 0;
    this.mouseMoveSinceLastFrame.y = 0;
    
    // 最终渲染
    this.renderer.render(this.scene, this.camera);
  }

  // 将疯狂模式的更新逻辑分离到单独的方法
  updateCrazyMode(delta) {
    this.table.getObjectByName('table-self').material.color.setHSL(this.hue, 1, 0.5);
    const singleplayerTable = this.table.getObjectByName('table-self-singleplayer');
    const opponentTable = this.table.getObjectByName('table-opponent');
    if (singleplayerTable) {
      singleplayerTable.material.color.setHSL(this.hue, 1, 0.5);
    }
    if (opponentTable) {
      opponentTable.material.color.setHSL(this.hue, 1, 0.5);
    }
    this.paddle.getObjectByName('Cap_1').material.color.setHSL((this.hue + 0.25) % 1, 1, 0.5);
    this.paddle.getObjectByName('Cap_2').material.color.setHSL((this.hue + 0.25) % 1, 1, 0.5);
    if (this.ball) {
      this.ball.material.color.setHSL((this.hue + 0.5) % 1, 1, 0.5);
    }
    const color = new Color();
    color.setHSL((this.hue + 0.8) % 1, 1, 0.5);
    this.renderer.setClearColor(color);
    this.hue = (this.hue + delta / 2.0) % 1;
  }
}