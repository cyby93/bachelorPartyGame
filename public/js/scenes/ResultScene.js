import Scene from './Scene.js';

export default class ResultScene extends Scene {
  constructor(game) {
    super(game);
    this.victory = false;
    this.totalTime = 0;
    this.totalKills = 0;
    this.mvpPlayer = null;
    this.mostDeathsPlayer = null;
  }

  enter(params = {}) {
    super.enter();
    
    this.victory = params.victory || false;
    this.totalTime = params.totalTime || 0;
    this.totalKills = params.totalKills || 0;
    
    // Calculate MVP (most damage dealt)
    const mvpData = this.game.calculateMVP();
    if (mvpData) {
      // Find player name from boss fight scene
      const player = this.game.scenes.bossFight.players.get(mvpData.playerId) ||
                     this.game.scenes.trashMob.players.get(mvpData.playerId);
      this.mvpPlayer = {
        id: mvpData.playerId,
        name: player ? player.name : 'Unknown',
        damage: mvpData.damage
      };
    }
    
    // Calculate most deaths
    const deathsData = this.game.calculateMostDeaths();
    if (deathsData) {
      // Find player name from boss fight scene
      const player = this.game.scenes.bossFight.players.get(deathsData.playerId) ||
                     this.game.scenes.trashMob.players.get(deathsData.playerId);
      this.mostDeathsPlayer = {
        id: deathsData.playerId,
        name: player ? player.name : 'Unknown',
        deaths: deathsData.deaths
      };
    }
    
    console.log('Result scene:', this.victory ? 'VICTORY' : 'DEFEAT');
  }

  exit() {
    super.exit();
  }

  update(deltaTime) {
    // No updates needed in result scene
  }

  draw(ctx, width, height) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Victory/Defeat title
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.victory ? '#FFD700' : '#FF4444';
    ctx.fillText(this.victory ? 'VICTORY!' : 'DEFEAT', width / 2, 150);
    
    // Statistics
    ctx.font = '32px Arial';
    ctx.fillStyle = '#FFFFFF';
    
    const stats = [
      `Total Time: ${this.formatTime(this.totalTime)}`,
      `Enemies Killed: ${this.totalKills}`,
      this.mvpPlayer ? `MVP: ${this.mvpPlayer.name} (${this.mvpPlayer.damage} damage)` : '',
      this.mostDeathsPlayer ? `Most Deaths: ${this.mostDeathsPlayer.name} (${this.mostDeathsPlayer.deaths})` : ''
    ];
    
    let y = 250;
    stats.forEach(stat => {
      if (stat) {
        ctx.fillText(stat, width / 2, y);
        y += 50;
      }
    });
    
    // Restart button hint
    ctx.font = '24px Arial';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText('Click RESTART to play again', width / 2, height - 100);
  }

  render(ctx) {
    this.draw(ctx, ctx.canvas.width, ctx.canvas.height);
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'restart_game':
        // Reset stats and transition to lobby
        this.game.resetStats();
        this.game.changeScene('lobby');
        break;
    }
  }
}
