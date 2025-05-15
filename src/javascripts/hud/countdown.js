import { createTextWithOutline } from '../util/textOutline.js';

const FONT_SIZE = 0.4;

export default class Countdown {
  constructor(scene, config, font) {
    this.scene = scene;
    this.font = font;
    this.config = config;

    this.countdown = createTextWithOutline(
      '5',
      this.font,
      {
        size: FONT_SIZE,
        fillColor: 0xffffff,
        outlineColor: 0xffffff,
        fillOpacity: 0.6,
        outlineOpacity: 1.0
      }
    );
    if (this.countdown.userData && this.countdown.userData.bbox) {
      console.log('box exists')
    }

    // 居中对齐
    this._recenter(this.countdown);
    this.scene.add(this.countdown);
  }

  _recenter(obj){
    const bb = obj.userData.bbox;
    obj.position.x = -bb.max.x / 2;
    obj.position.y = this.config.tableHeight + 0.2;
    obj.position.z = this.config.tablePositionZ + 0.5;
  }

  setCountdown(n) {
    this.scene.remove(this.countdown);
    if (this.countdown.type === 'Group') {
      // 对于组，需要遍历子对象并清理
      this.countdown.children.forEach(child => {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    } else if (this.countdown.geometry) {
      // 对于普通mesh，直接清理几何体
      this.countdown.geometry.dispose();
    }
    this.countdown = createTextWithOutline(
      String(n),
      this.font,
      {
        size: FONT_SIZE,
        fillColor: 0xffffff,
        outlineColor: 0xffffff,
        fillOpacity: 0.6,
        outlineOpacity: 1.0
      }
    );
    this._recenter(this.countdown);
    this.scene.add(this.countdown);
  }

  showCountdown() {
    this.setCountdown(5);
    this.countdown.visible = true;
  }

  hideCountdown() {
    this.countdown.visible = false;
  }
}
