import {
  MeshBasicMaterial, Mesh, Group, CircleGeometry, DoubleSide,
} from 'three';
import { createTextOutline } from '../util/textOutline.js';
import {MODE} from '../constants';

export default class ScoreDisplay {
  constructor(parent, config, font) {
    this.parent = parent;
    this.font = font;
    this.config = config;
    this.lives = [];

    this.setupText();
  }

  setupText() {
    // 创建分数显示，使用textOutline
    this.opponentScore = createTextOutline('0', this.font, {
      size: 0.35,
      height: 0
    });
    
    // 克隆不可行，所以要重新创建
    this.selfScore = createTextOutline('0', this.font, {
      size: 0.35,
      height: 0
    });

    this.selfScore.rotation.y = Math.PI / 2;
    this.opponentScore.rotation.y = -Math.PI / 2;

    this.parent.add(this.selfScore);
    this.parent.add(this.opponentScore);

    this.setSelfScore(0);
    this.setOpponentScore(0);
    this.opponentScore.visible = this.config.mode === MODE.MULTIPLAYER;

    this.lifeGroup = new Group();
    for (let i = 0; i < this.config.startLives; i += 1) {
      const geometry = new CircleGeometry(0.025, 32);
      const material = new MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        side: DoubleSide,
        opacity: 1,
        wireframe: true,
      });
      const life = new Mesh(geometry, material);
      life.position.x = i * 0.12;
      this.lives.push(life);
      this.lifeGroup.add(life);
    }
    this.lifeGroup.position.z = -1.4;
    this.lifeGroup.position.y = this.config.tableHeight + 0.24;
    this.lifeGroup.position.x = this.config.tableWidth / 2;
    this.lifeGroup.rotation.y = Math.PI / 2;
    this.lifeGroup.rotation.x = Math.PI;
    this.lifeGroup.visible = this.config.mode === MODE.SINGLEPLAYER;

    this.parent.add(this.lifeGroup);
  }

  setSelfScore(value) {
    // 移除旧的分数
    this.parent.remove(this.selfScore);
    
    // 创建新的分数显示
    this.selfScore = createTextOutline(`${value}`, this.font, {
      size: 0.35,
      height: 0
    });
    
    this.selfScore.rotation.y = Math.PI / 2;
    
    this.selfScore.position.x = -this.config.tableWidth / 2;
    this.selfScore.position.y = this.config.tableHeight + 0.2;
    this.selfScore.position.z = this.config.tablePositionZ
      + this.config.tableDepth / 2.8
      + this.selfScore.userData.bbox.max.x / 2;
      
    this.parent.add(this.selfScore);
  }

  setOpponentScore(value) {
    // 移除旧的分数
    this.parent.remove(this.opponentScore);
    
    // 创建新的分数显示
    this.opponentScore = createTextOutline(`${value}`, this.font, {
      size: 0.35,
      height: 0
    });
    
    this.opponentScore.rotation.y = -Math.PI / 2;

    this.opponentScore.position.x = this.config.tableWidth / 2;
    this.opponentScore.position.y = this.config.tableHeight + 0.2;
    this.opponentScore.position.z = this.config.tablePositionZ
      - this.config.tableDepth / 4
      - this.opponentScore.userData.bbox.max.x / 2 + 0.2;
      
    this.parent.add(this.opponentScore);
  }

  setLives(value) {
    this.lives.forEach((life, index) => {
      life.material.opacity = value > index ? 1 : 0.3;
    });
  }

  hide() {
    this.opponentScore.visible = false;
    this.selfScore.visible = false;
    this.lives.forEach(life => {life.visible = false;});
  }

  show(multiplayer) {
    this.opponentScore.visible = multiplayer;
    this.selfScore.visible = true;
    this.lives.forEach(life => {life.visible = !multiplayer;});
  }
}