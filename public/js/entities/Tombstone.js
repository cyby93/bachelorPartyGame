export default class Tombstone {
  constructor(player) {
    this.x = player.x;
    this.y = player.y;
    this.playerId = player.id;
    this.playerName = player.name;
    this.radius = 25;
    this.reviveProgress = 0;
    this.isBeingRevived = false;
    this.reviverName = null;
  }

  render(ctx) {
    ctx.save();
    ctx.fillStyle = '#555';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.radius);
    ctx.lineTo(this.x + this.radius * 0.7, this.y);
    ctx.lineTo(this.x + this.radius * 0.7, this.y + this.radius);
    ctx.lineTo(this.x - this.radius * 0.7, this.y + this.radius);
    ctx.lineTo(this.x - this.radius * 0.7, this.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.radius * 0.5);
    ctx.lineTo(this.x, this.y + this.radius * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - this.radius * 0.4, this.y - this.radius * 0.2);
    ctx.lineTo(this.x + this.radius * 0.4, this.y - this.radius * 0.2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.playerName, this.x, this.y + this.radius + 15);
    if (this.isBeingRevived) {
      const barWidth = 50;
      const barHeight = 6;
      const barX = this.x - barWidth / 2;
      const barY = this.y + this.radius + 20;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(barX, barY, barWidth * this.reviveProgress, barHeight);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      if (this.reviverName) {
        ctx.fillStyle = '#2ecc71';
        ctx.font = '10px Arial';
        ctx.fillText(`${this.reviverName} reviving...`, this.x, barY - 5);
      }
    } else {
      ctx.fillStyle = '#aaa';
      ctx.font = '10px Arial';
      ctx.fillText('Press to revive', this.x, this.y + this.radius + 25);
    }
    ctx.restore();
  }

  updateReviveProgress(progress, reviverName) {
    this.isBeingRevived = progress > 0;
    this.reviveProgress = Math.min(1, progress);
    this.reviverName = reviverName;
  }
}
