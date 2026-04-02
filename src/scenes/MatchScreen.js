// MatchScreen.js
// Phaser Scene — main match view. Renders the ring, wrestlers, and receives
// turn events from TurnManager via the React bridge.

import Phaser from 'phaser';

export default class MatchScreen extends Phaser.Scene {
  constructor() {
    super({ key: 'MatchScreen' });
  }

  preload() {}

  create() {
    // TODO: set up ring background, wrestler sprites, react to turn events
  }

  update() {}
}
