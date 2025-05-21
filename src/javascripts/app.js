// import NoSleep from 'nosleep';
import {
  TweenMax, TimelineMax, 
  // Power0, Power1, Power4, SlowMo, Back,
} from 'gsap';
import $ from 'zepto-modules';
import MobileDetect from 'mobile-detect';
import Clipboard from 'clipboard';
import bodymovin from 'bodymovin';
import EventEmitter from 'event-emitter';
import {
  EVENT, MODE, STATE, CONTROLMODE,
} from './constants';
import Scene from './scene';
import XRUtil from './xr-util';
import Communication from './communication';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

const screenTransitionDuration = 1;
const screenTransitionInterval = 0.1;
const screenTransitionEase = "power4.out";

/* global ga */

class PingPong {
  constructor() {
    this.emitter = EventEmitter({});
    this.communication = new Communication(this.emitter);
    this.scene = new Scene(this.emitter, this.communication);
    this.setupDOMHandlers();
    this.setupCustomEventHandlers();
    this.introBallTween = null;
    this.activeScreen = '.welcome-screen';
    this.mobileDetect = new MobileDetect(window.navigator.userAgent);

    if (XRUtil.isMobile() && 'orientation' in window) {
      this.checkPhoneOrientation();
    } else {
      this.startLoading();
    }
    this.iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (this.iOS) {
      // cant reliably go fullscreen in ios so just hide the button
      this.hideFullscreenButton();
      TweenMax.set('.enter-vr', {
        right: '0',
        bottom: '-10px',
      });
      TweenMax.set('.reset-pose', {
        right: '60px',
      });
    }
  }

  checkPhoneOrientation() {
    TweenMax.set('.phone', {rotation: 90});
    TweenMax.set('.checkmark', {visibility: 'hidden'}, 0.3);
    const tl = new TimelineMax({repeat: -1, repeatDelay: 1, paused: true});
    tl.to('.phone', 0.5, {
      ease: "back.inOut(1)",
      rotation: 180,
    });
    tl.set('.x', {visibility: 'hidden'}, 0.3);
    tl.set('.checkmark', {visibility: 'visible'}, 0.3);
    tl.to('.phone', 0.5, {
      ease: "back.inOut(1)",
      rotation: 90,
    }, '+=1');
    tl.set('.x', {visibility: 'visible'}, '-=0.2');
    tl.set('.checkmark', {visibility: 'hidden'}, '-=0.2');
    if ($(window).width() < $(window).height()) {
      TweenMax.set('.rotate-phone-screen', {
        visibility: 'visible',
      });
      tl.play();
    } else if (!this.startedLoading) {
      this.startLoading();
    }
    $(window).on('orientationchange', () => {
      setTimeout(() => {
        if ($(window).width() > $(window).height()) {
          TweenMax.to('.rotate-phone-screen', 0.3, {
            autoAlpha: 0,
          });
          if (!this.startedLoading) {
            this.startLoading();
          }
          tl.pause();
        } else {
          TweenMax.to('.rotate-phone-screen', 0.3, {
            autoAlpha: 1,
          });
          tl.play();
        }
      }, 400);
    });
  }

  startLoading() {
    this.startedLoading = true;
    Promise.all([
      this.scene.setup(),
      this.loadModeChooserAnimation(),
      this.loadingAnimation(),
    ]).then(() => {
      this.welcomeAnimation();
      if (this.scene.renderer) {
        const vrButton = VRButton.createButton(this.scene.renderer);
        document.body.appendChild(vrButton);
        
        // 添加XR会话结束事件监听
        this.scene.renderer.xr.addEventListener('sessionend', () => {
          console.log('XR session ended (sessionend event)');
          this.scene.config.state = STATE.PAUSED;
          this.scene.showOverlay();
          $('.game-over-screen-wrapper').show();
          $('.enter-vr').show();
          // 添加页面刷新
          window.location.reload();
        });
      } else {
        console.error('Renderer not available in app.js for VRButton.createButton');
      }
    }).catch(e => {
      console.warn(e);
    });
  }

  hideFullscreenButton() {
    if (this.iOS) {
      TweenMax.set('.fullscreen-button', {
        display: 'none',
      });
    }
  }

  // eslint-disable-next-line
  loadingAnimation() {
    return new Promise(resolve => {
      TweenMax.to('header span', 0.5, {
        ease: "power1.inOut",
        width: '100%',
        onComplete: () => {
          TweenMax.set('header h1', {
            opacity: 1,
            color: '#fff',
          });
          $('header span').remove();
          resolve();
        },
      });
    });
  }

  introAnimation() {
    TweenMax.to(['.intro-screen > div > *'], 0.5, {
      y: 10,
    });
    TweenMax.to(['.intro-screen > div > *'], 0.2, {
      opacity: 1,
      delay: 0.3,
    });
    TweenMax.to(['.ui'], 0.8, {
      opacity: 1,
    });
    this.startBallTween();
  }

  startBallTween() {
    const ballRadius = parseInt($('#ball').attr('r'), 10);
    const no = {
      x: Math.random() > 0.5 ? -ballRadius : 1920 + ballRadius,
      y: Math.random() * 800 - 400,
    };
    this.introBallTween = new TimelineMax({
      onComplete: () => {
        setTimeout(() => {
          if (!this.introOver) {
            this.startBallTween();
          }
        }, Math.random() * 2000);
      },
    });
    const $ball = $('#ball');
    const $shadow = $('#ball-shadow');
    const startY = no.y;
    const shadowPos = 840;
    const speed = 1.8;
    this.introBallTween.to(no, 1 / speed, {
      x: no.x > 0 ? -ballRadius : 1920 + ballRadius,
      ease: "none",
      onUpdate: () => {
        $ball.attr('cx', no.x);
        $shadow.attr('cx', no.x);
        $shadow.attr('cy', shadowPos);
        const rx = 40 + 15 * (1 - (shadowPos - no.y) / shadowPos);
        const ry = rx / 2;
        $shadow.attr('rx', rx);
        $shadow.attr('ry', ry);
      },
    }, 0);
    this.introBallTween.to(no, 0.6 / speed, {
      y: 800,
      ease: "power1.in",
      onUpdate: () => {
        $ball.attr('cy', no.y);
      },
      onComplete: () => {
      },
    }, 0);
    this.introBallTween.call(() => {
      this.scene.sound.table();
    }, null, null, '-=0.216');
    this.introBallTween.to(no, 0.8 / speed, {
      y: startY + 150,
      ease: "power1.out",
      onUpdate: () => {
        $ball.attr('cy', no.y);
      },
    }, 0.6 / speed);
  }

  setupCustomEventHandlers() {
    this.emitter.on(EVENT.GAME_OVER, () => {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    });
    this.emitter.on(EVENT.EXIT_BUTTON_PRESSED, () => {
      if (this.scene.renderer.xr.isPresenting) {
        const session = this.scene.renderer.xr.getSession();
        if (session) {
          session.end()
            .then(() => {
              // 会话真正结束后再刷新
              window.location.reload();
            })
            .catch(error => {
              console.error('Error ending XR session:', error);
            });
        }
      }
    });
    this.emitter.on(EVENT.OPPONENT_DISCONNECTED, () => {
      this.scene.showOverlay();
      this.scene.hud.message.setMessage('opponent disconnected');
      this.scene.hud.message.showMessage();
      this.scene.paddleOpponent.visible = false;
      this.scene.config.state = STATE.PAUSED;
    });
    this.emitter.on(EVENT.OPPONENT_PAUSED, () => {
      if (this.scene.config.state !== STATE.PLAYING) {
        return;
      }
      this.scene.hud.message.setMessage('opponent paused');
      this.scene.hud.message.showMessage();
      this.scene.config.state = STATE.PAUSED;
      this.scene.showOverlay();
    });
    this.emitter.on(EVENT.OPPONENT_UNPAUSED, () => {
      this.scene.hud.message.hideMessage();
      this.scene.config.state = STATE.PLAYING;
      this.scene.hideOverlay();
    });
  }

  loadModeChooserAnimation() {
    return Promise.all([
      new Promise(resolve => {
        $.getJSON('/animations/1player-v3.json', data => {
          this.singleplayerAnimation = bodymovin.loadAnimation({
            container: document.getElementById('singleplayer-animation'),
            renderer: 'svg',
            loop: true,
            animationData: data,
          });
          resolve();
        });
      }),
      new Promise(resolve => {
        $.getJSON('/animations/2player-v3.json', data => {
          this.multiplayerAnimation = bodymovin.loadAnimation({
            container: document.getElementById('multiplayer-animation'),
            renderer: 'svg',
            loop: true,
            animationData: data,
          });
          resolve();
        });
      }),
    ]);
  }

  setupDOMHandlers() {
    $(document).on('visibilitychange', this.onVisibilityChange.bind(this));
    $('#start-singleplayer').on('click', this.onStartSingleplayerClick.bind(this));
    $('#open-room').on('click', this.onOpenRoomClick.bind(this));
    $('#join-room').on('click', this.onJoinRoomClick.bind(this));
    $('#play-again').on('click', this.onPlayAgainClick.bind(this));
    $('.enter-vr').on('click', this.onEnterVRClick.bind(this));
    $('#tilt').on('click', this.onTiltClick.bind(this));
    $('.reset-pose').on('click', this.scene.resetPose.bind(this.scene));
    $('button.btn').on('click', () => {this.scene.sound.playUI('button');});
    $('#reload').on('click', window.location.reload);
    $('.join-room-screen .back-arrow').on('click', () => {this.backAnimation('.choose-mode-screen');});
    $('.open-room-screen .back-arrow').on('click', () => {this.backAnimation('.choose-mode-screen');});
    $('.mute').on('click', this.scene.sound.toggleMute.bind(this.scene.sound));
    $('#left-hand').on('click', () => { this.startGameWithHand('left'); });
    $('#right-hand').on('click', () => { this.startGameWithHand('right'); });
    $('input').on('focus', e => {
      if (XRUtil.isMobile()) {
        TweenMax.to(e.target, 0.3, {
          scale: 0.5,
        });
      }
    });
    $('input').on('blur', e => {
      TweenMax.to(e.target, 0.3, {
        scale: 1,
      });
    });
    $('button.btn:not(.about-button)').mouseenter(function buttonIn() {
      TweenMax.to($(this), 0.2, {
        boxShadow: 'inset 0px 0px 0px 2px rgba(255, 255, 255, 1)',
      });
    }).mouseleave(function buttonOut() {
      TweenMax.to($(this), 0.2, {
        boxShadow: 'inset 0px 0px 0px 0px rgba(255, 255, 255, 0)',
      });
    });

    $('button.btn').on('click', function onAnyButtonClick() {
      const duration = 0.1;
      TweenMax.to($(this), duration, {
        backgroundColor: '#fff',
      });
      TweenMax.to($(this), duration, {
        backgroundColor: 'transparent',
        delay: duration,
      });
    });

    // 添加用户名输入处理
    this.username = '';
    $('#username').on('input', (e) => {
      this.username = e.target.value.trim();
      // 根据用户名是否为空来启用/禁用Enter按钮
      if (this.username) {
        $('#enter-game').removeClass('disabled');
      } else {
        $('#enter-game').addClass('disabled');
      }
    });

    // 添加Enter按钮点击事件
    $('#enter-game').on('click', () => {
      if (this.username) {
        this.enterGameAnimation();
      }
    });

    // 添加回车键处理
    $('#username').on('keypress', (e) => {
      if (e.which === 13 && this.username) {  // 13是回车键的keyCode
        this.enterGameAnimation();
      }
    });
  }

  onVisibilityChange() {
    if (document.hidden) {
      this.scene.tabActive = false;
      this.scene.sound.blur();
      if (this.scene.communication.isOpponentConnected && this.scene.config.state === STATE.PLAYING) {
        this.scene.communication.sendPause();
      }
    } else {
      this.scene.tabActive = true;
      this.scene.firstActiveFrame = this.scene.frameNumber;
      this.scene.sound.focus();
      if (this.scene.communication.isOpponentConnected && this.scene.config.state === STATE.PLAYING) {
        this.scene.communication.sendUnpause();
      }
    }
  }

  onEnterVRClick() {
    this.enterVRButton.requestEnterVR();
  }

  onStartSingleplayerClick() {
    $('.choose-vr-mode-screen').removeClass('blue green');
    $('.choose-vr-mode-screen').addClass('pink');
    $('.choose-vr-mode-screen a .before, .choose-vr-mode-screen #tilt .before').addClass('pink');
    this.scene.setSingleplayer();
    this.viewVRChooserScreen();
  }

  onOpenRoomClick() {
    $('.choose-vr-mode-screen').removeClass('pink green');
    $('.choose-vr-mode-screen').addClass('blue');
    $('.choose-vr-mode-screen a .before, .choose-vr-mode-screen #tilt .before').addClass('blue');
    this.scene.setMultiplayer();
    this.viewOpenRoomScreenAnimation();
  }

  onJoinRoomClick() {
    $('.choose-vr-mode-screen').removeClass('pink blue');
    $('.choose-vr-mode-screen').addClass('green');
    $('.choose-vr-mode-screen a .before, .choose-vr-mode-screen #tilt .before').addClass('green');
    this.scene.setMultiplayer();
    this.viewJoinRoomScreenAnimation();
  }

  onPlayAgainClick() {
    if (this.scene.config.mode === MODE.MULTIPLAYER) {
      $('#play-again').text('waiting for opponent to restart');
      this.scene.playerRequestedRestart = true;
      this.communication.sendRestartGame();
    }
    this.scene.restartGame();
  }

  onTiltClick() {
    if (XRUtil.isMobile() || this.mobileDetect.tablet()) {
      console.log('倾斜点击：移动设备，考虑是否仍需此逻辑或由VRButton统一处理');
    } else {
      console.log('切换到鼠标控制模式');
      this.scene.controlMode = CONTROLMODE.MOUSE;
    }
    this.scene.startGame();
    this.hideFullscreenButton();
  }

  viewVRChooserScreen() {
    if (this.scene.config.mode === MODE.MULTIPLAYER) {
      ga('send', 'event', 'Mode', 'custom', 'Multiplayer');
    } else {
      ga('send', 'event', 'Mode', 'custom', 'Singleplayer');
    }
    return new Promise(resolve => {
      this.scene.sound.playUI('transition');
      const tl = new TimelineMax();
      tl.set('.choose-vr-mode-screen, .transition-color-screen', {
        left: '-100%',
      });
      tl.set([
        '.open-room-screen',
        '.join-room-screen',
        '.choose-mode-screen',
      ], {zIndex: 10});
      tl.set('.transition-color-screen', {zIndex: 11});
      tl.set('.choose-vr-mode-screen', {zIndex: 12, display: 'block'});
      tl.to([
        '.open-room-screen',
        '.join-room-screen',
        '.choose-mode-screen',
      ], screenTransitionDuration, {
        left: '100%',
        ease: screenTransitionEase,
      });
      tl.staggerTo([
        '.transition-color-screen.pink',
        '.transition-color-screen.blue',
        '.transition-color-screen.green',
        '.choose-vr-mode-screen',
      ], screenTransitionDuration, {
        left: '0%',
        ease: screenTransitionEase,
      }, screenTransitionInterval, `-=${screenTransitionDuration + screenTransitionInterval}`);
      tl.call(() => {
        bodymovin.stop();
        bodymovin.destroy();
        bodymovin.stop();
        bodymovin.destroy();
      });
      tl.call(resolve);
    });
  }

  viewJoinRoomScreenAnimation() {
    return new Promise(resolve => {
      this.activeScreen = '.join-room-screen';
      $('#room-code').focus();
      $('#room-code').bind('input', () => {
        this.scene.sound.playUI('type');
        if ($('#room-code').val().length !== 0) {
          $('.input-wrapper .placeholder').hide();
        } else {
          $('.input-wrapper .placeholder').show();
        }
        if ($('#room-code').val().length === 4) {
          $('#join-room-button').removeClass('inactive');
          $('#join-room-button').css('pointer-events', 'auto');
        } else {
          $('#join-room-button').addClass('inactive');
          $('#join-room-button').css('pointer-events', 'none');
        }
      });
      $('#room-form').on('submit', () => {
        // hack to close android keyboard after submit
        $('#room-code').attr('readonly', 'readonly');
        setTimeout(() => {
          $('#room-code').blur();
          $('#room-code').removeAttr('readonly');
        }, 100);

        $('#room-form .grey-text').css('color', '#fff');
        $('#room-form .grey-text').text('connecting to server...');
        const loadingTL = new TimelineMax({
          repeat: -1,
          repeatDelay: 0.5,
        });
        loadingTL.call(() => {
          $('#room-form .grey-text').html('connecting to server&nbsp;&nbsp;&nbsp;');
        }, null, null, 0.5);
        loadingTL.call(() => {
          $('#room-form .grey-text').html('connecting to server.&nbsp;&nbsp;');
        }, null, null, 1);
        loadingTL.call(() => {
          $('#room-form .grey-text').html('connecting to server..&nbsp;');
        }, null, null, 1.5);
        loadingTL.call(() => {
          $('#room-form .grey-text').html('connecting to server...');
        }, null, null, 2);

        this.communication.tryConnecting($('#room-code').val().toUpperCase()).then(() => {
          $('#room-form .grey-text').text('game starts');
          $('#room-form #join-room-button').css('visibility', 'hidden');
          TweenMax.set('.opponent-icon > *', {fill: '#fff'});
          loadingTL.kill();
          setTimeout(() => {
            this.viewVRChooserScreen();
          }, 1000);
        }).catch(err => {
          loadingTL.kill();
          $('#room-form .grey-text').text(err);
        });
      });

      this.scene.sound.playUI('transition');
      this.scene.sound.playLoop('waiting');

      const tl = new TimelineMax();
      tl.set('.join-room-screen form > *', {
        opacity: 0,
        y: 10,
      });
      $('.intro-wrapper').removeClass('green blue pink');
      $('.intro-wrapper').addClass('pink');
      tl.set('.choose-mode-screen', {zIndex: 10});
      tl.set('.transition-color-screen.green', {zIndex: 11});
      tl.set('.transition-color-screen.blue', {zIndex: 12});
      tl.set('.join-room-screen', {zIndex: 13});
      tl.to('.choose-mode-screen', screenTransitionDuration, {
        left: '100%',
        ease: screenTransitionEase,
      });
      tl.staggerTo([
        '.transition-color-screen.green',
        '.transition-color-screen.blue',
        '.join-room-screen',
      ], screenTransitionDuration, {
        left: '0%',
        ease: screenTransitionEase,
      }, screenTransitionInterval, `-=${screenTransitionDuration - screenTransitionInterval}`);
      tl.staggerTo([
        '.join-room-screen .input-wrapper',
        '.join-room-screen .grey-text',
        '.join-room-screen #join-room-button',
      ], 0.3, {
        y: 0,
        opacity: 1,
      }, 0.1);
      tl.call(resolve);
    });
  }

  backAnimation(to, fromAboutScreen = false) {
    this.scene.sound.playUI('transition');
    const tl = new TimelineMax();
    tl.set('.choose-mode-screen', {zIndex: 10});
    tl.set(`.transition-color-screen.${this.activeScreen === '.join-room-screen' ? 'blue' : 'green'}`, {zIndex: 11, left: '0'});
    tl.set(`.transition-color-screen.${this.activeScreen === '.join-room-screen' ? 'green' : 'blue'}`, {zIndex: 11, left: '-100%'});
    tl.set('.transition-color-screen.pink', {zIndex: 12, left: '0'});
    if (!fromAboutScreen) {
      tl.set('.join-room-screen, .open-room-screen', {zIndex: 13});
    }
    tl.staggerTo([
      fromAboutScreen ? '.about-screen' : this.activeScreen,
      '.transition-color-screen.pink',
      `.transition-color-screen.${this.activeScreen === '.join-room-screen' ? 'blue' : 'green'}`,
    ], screenTransitionDuration, {
      left: '-100%',
      ease: screenTransitionEase,
    }, screenTransitionInterval);
    tl.to([
      fromAboutScreen ? this.activeScreen : to,
    ], screenTransitionDuration, {
      left: '0%',
      ease: screenTransitionEase,
    }, `-=${screenTransitionDuration}`);
    if (!fromAboutScreen) {
      this.scene.sound.playLoop('bass-pad');
    }
    this.activeScreen = to;
  }

  viewOpenRoomScreenAnimation() {
    return new Promise(resolve => {
      this.activeScreen = '.open-room-screen';
      this.communication.chooseClosestServer().then(() => {
        const id = this.communication.openRoom();
        $('#generated-room-code').val(id);
        $('.opponent-joined').text('waiting for opponent');
      }).catch(e => {
        console.warn(e);
        $('.opponent-joined').text('cannot connect to server');
        TweenMax.killTweensOf('.opponent-joined');
        TweenMax.set('.opponent-joined', {visibility: 'visible', opacity: 1});
      });

      // TODO annoying during development
      this.emitter.on(EVENT.OPPONENT_CONNECTED, () => {
        this.scene.sound.playUI('joined');
        $('.opponent-joined').text('Opponent joined');
        TweenMax.set('.opponent-icon > *', {fill: '#fff'});
        $('#join-waiting-room').hide();
        TweenMax.killTweensOf('.opponent-joined');
        TweenMax.set('.opponent-joined', {visibility: 'visible', opacity: 1});
        setTimeout(() => {
          this.viewVRChooserScreen();
        }, 1000);
      });

      this.scene.sound.playUI('transition');
      this.scene.sound.playLoop('waiting');

      $('.intro-wrapper').removeClass('green blue pink');
      $('.intro-wrapper').addClass('pink');

      // eslint-disable-next-line
      let clip2 = new Clipboard('#generated-room-code');
      const tl = new TimelineMax();
      tl.set('.open-room-screen > .inner > *', {
        opacity: 0,
        y: 10,
      });
      tl.set(['#generated-room-code', '.open-room-screen .grey-text'], {
        opacity: 0,
        y: 10,
      });
      tl.set(['.open-room-screen .opponent-joined'], {
        opacity: 0,
      });
      tl.set('.choose-mode-screen', {zIndex: 10});
      tl.set('.transition-color-screen', {zIndex: 11, left: '-100%'});
      tl.set('.open-room-screen', {zIndex: 12});
      tl.to('.choose-mode-screen', screenTransitionDuration, {
        left: '100%',
        ease: screenTransitionEase,
      });
      tl.staggerTo([
        '.transition-color-screen.blue',
        '.transition-color-screen.green',
        '.open-room-screen',
      ], screenTransitionDuration, {
        left: '0%',
        ease: screenTransitionEase,
      }, screenTransitionInterval, `-=${screenTransitionDuration}`);
      tl.staggerTo(['#generated-room-code', '.open-room-screen .grey-text'], 0.3, {
        y: 0,
        opacity: 1,
      });
      tl.to(['.open-room-screen .opponent-joined'], 0.3, {
        opacity: 1,
      }, '+=0.5');
      tl.call(resolve);

      const blinkSpeed = 1;
      const blinkTL = new TimelineMax({repeat: -1, repeatDelay: blinkSpeed});
      blinkTL.set('.opponent-joined', {
        color: '#392a85',
      }, 0);
      blinkTL.set('.opponent-joined', {
        color: '#ffffff',
      }, blinkSpeed);
    }).catch(e => {
      console.warn(e);
    });
  }

  startGameWithHand(handedness) {
    this.scene.handedness = handedness;
    this.scene.sound.playLoop('bass-pad');
    this.scene.sound.playUI('transition');
    const tl = new TimelineMax();
    tl.set('.intro-screen', {zIndex: 10});
    const width = $(window).width();
    tl.staggerTo([
      '.intro-screen h1',
      '.intro-screen p',
      '.intro-screen .handedness-buttons',
      '.intro-screen',
    ], screenTransitionDuration, {
      x: width,
      ease: screenTransitionEase,
    }, screenTransitionInterval);
    tl.set('.intro-screen', {display: 'none'});
    tl.call(() => {
      if (this.introBallTween && typeof this.introBallTween.kill === 'function') {
        this.introBallTween.kill();
      }
      this.introOver = true;
      this.scene.setSingleplayer();
      this.scene.startGame();
      this.activeScreen = null;
    });
  }

  welcomeAnimation() {
    // 初始化欢迎界面的位置和透明度
    TweenMax.set('.welcome-screen .inner > *', {
      y: 50,
      opacity: 0
    });
    
    // 创建动画序列
    const tl = new TimelineMax();
    
    // 显示欢迎界面的元素
    tl.staggerTo('.welcome-screen .inner > *', 0.5, {
      y: 0,
      opacity: 1,
      ease: "power1.out"
    }, 0.1);
    
    // 显示UI元素
    tl.to('.ui', 0.8, {
      opacity: 1
    }, "-=0.3");

    // 初始化Enter按钮状态
    $('#enter-game').addClass('disabled');
  }

  enterGameAnimation() {
    this.scene.sound.playUI('transition');
    const tl = new TimelineMax();
    
    // 设置初始状态
    tl.set('.intro-screen', {
      x: '100%',
      display: 'block'
    });
    
    // 欢迎界面元素淡出并向左移动
    tl.to('.welcome-screen .inner > *', 0.5, {
      x: -100,
      opacity: 0,
      ease: "power2.in",
      stagger: 0.1
    });
    
    // 整个欢迎界面向左移动
    tl.to('.welcome-wrapper', 0.8, {
      x: '-100%',
      ease: "power2.inOut"
    }, "-=0.3");
    
    // intro界面从右侧滑入
    tl.to('.intro-screen', 0.8, {
      x: '0%',
      ease: "power2.out"
    }, "-=0.5");
    
    // 完成过渡后启动intro动画
    tl.call(() => {
      this.welcomeOver = true;
      this.introAnimation();
      // 隐藏欢迎界面
      TweenMax.set('.welcome-wrapper', { display: 'none' });
    });
  }
}

// eslint-disable-next-line
const p = new PingPong();
