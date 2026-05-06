/**
 * client/host/scenes/ResultRenderer.js
 *
 * Stub — result and gameover screens are now rendered by SceneOverlay.svelte
 * (ResultScreen.svelte). HostGame still needs this entry in this.renderers,
 * but the canvas does nothing; the DOM overlay handles everything.
 */

export default class ResultRenderer {
  constructor(_game, _isVictory) {}
  setLevelMeta(_meta) {}
  enter()  {}
  exit()   {}
  update() {}
  resize() {}
}
