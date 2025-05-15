import { createTextOutline, createTextFilled } from '../util/textOutline.js';

const FONT_SIZE = 0.4;

export default class Countdown {
  constructor(scene, config, font) {
    this.scene = scene;
    this.font = font;
    this.config = config;

    this.countdown = createTextFilled(
      '5',
      this.font,
      { size: FONT_SIZE, color: 0xffffff }
    );

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
    this.countdown.geometry.dispose();
    this.countdown = createTextOutline(
      String(n),
      this.font,
      { size : FONT_SIZE }
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
