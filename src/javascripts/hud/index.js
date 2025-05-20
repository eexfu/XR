import { Group } from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import ScoreDisplay from './score-display';
import Countdown from './countdown';
import Message from './message';
import Arrows from './arrows';

export default class Hud {
  constructor(scene, config, emitter, loader) {
    this.config = config;
    this.emitter = emitter;
    this.scene = scene;
    this.gravity = 0;
    this.ballRadius = 0.03;
    this.ballPaddleBounciness = 1;
    this.ballBoxBounciness = 1;
    this.ballInitVelocity = 1;
    this.paddleModel = 'box';
    this.activateTween = null;

    this.loader = loader;
    this.font = null;
    this.container = null;
    this.initialized = false;
    this.modeWasSelected = false;

    // VR-specific elements
    this.vrControls = null;
    this.vrMessage = null;
  }

  showVRControls() {
    if (!this.vrControls) {
      // Create VR controls container
      this.vrControls = document.createElement('div');
      this.vrControls.style.position = 'absolute';
      this.vrControls.style.bottom = '20px';
      this.vrControls.style.left = '50%';
      this.vrControls.style.transform = 'translateX(-50%)';
      this.vrControls.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.vrControls.style.padding = '10px';
      this.vrControls.style.borderRadius = '5px';
      this.vrControls.style.color = 'white';
      this.vrControls.style.fontFamily = 'Arial, sans-serif';
      this.vrControls.style.textAlign = 'center';
      this.vrControls.style.display = 'none';

      // Add VR instructions
      const instructions = document.createElement('div');
      instructions.innerHTML = `
        <h3>VR Controls</h3>
        <p>Use controllers to move the paddle</p>
        <p>Press trigger to hit the ball</p>
        <p>Look at menu items to select</p>
      `;
      this.vrControls.appendChild(instructions);

      document.body.appendChild(this.vrControls);
    }

    this.vrControls.style.display = 'block';
  }

  hideVRControls() {
    if (this.vrControls) {
      this.vrControls.style.display = 'none';
    }
  }

  showVRMessage(text, duration = 3000) {
    if (!this.vrMessage) {
      this.vrMessage = document.createElement('div');
      this.vrMessage.style.position = 'absolute';
      this.vrMessage.style.top = '20px';
      this.vrMessage.style.left = '50%';
      this.vrMessage.style.transform = 'translateX(-50%)';
      this.vrMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.vrMessage.style.padding = '10px';
      this.vrMessage.style.borderRadius = '5px';
      this.vrMessage.style.color = 'white';
      this.vrMessage.style.fontFamily = 'Arial, sans-serif';
      this.vrMessage.style.textAlign = 'center';
      this.vrMessage.style.display = 'none';
      document.body.appendChild(this.vrMessage);
    }

    this.vrMessage.textContent = text;
    this.vrMessage.style.display = 'block';

    if (duration) {
      setTimeout(() => {
        this.vrMessage.style.display = 'none';
      }, duration);
    }
  }

  hideVRMessage() {
    if (this.vrMessage) {
      this.vrMessage.style.display = 'none';
    }
  }

  setup() {    
    const fontloader = new FontLoader();
    return new Promise(resolveOuter => {
      Promise.all([
        new Promise(resolve => {
          fontloader.load('fonts/helvetiker_regular.typeface.json', font => {
            console.log('Loaded font:', font);
            this.antique = font;
            resolve();
          });
        }),
        new Promise(resolve => {
          fontloader.load('fonts/helvetiker_regular.typeface.json', font => {
            console.log('Loaded font:', font);
            this.font = font;
            resolve();
          });
        }),
      ]).then(() => {
        this.container = new Group();
        this.container.position.z = 1;
        this.container.position.y = 1.6;
        this.container.rotation.y = Math.PI;
        this.scene.add(this.container);

        this.initialized = true;

        this.message = new Message(this.scene, this.config, this.font, this.antique, this.emitter);
        console.log('message:', this.message);
        this.message.hideMessage();

        this.scoreDisplay = new ScoreDisplay(this.scene, this.config, this.font);
        this.countdown = new Countdown(this.scene, this.config, this.antique);
        this.countdown.hideCountdown();
        Arrows(this.font, this.loader).then(arrow => {
          this.arrows = arrow;
          this.scene.add(arrow);
          resolveOuter();
        }).catch(e => {
          console.warn(e);
        });
      }).catch(e => {
        console.warn(e);
      });
    }).catch(e => {
      console.warn(e);
    });
  }
}
