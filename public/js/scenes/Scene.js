export default class Scene {
  constructor(game) {
    this.game = game;
    this.isActive = false;
  }

  enter() {
    this.isActive = true;
  }

  exit() {
    this.isActive = false;
  }

  update(deltaTime) {}

  render(ctx) {}

  handleSocketEvent(eventName, data) {}
}
