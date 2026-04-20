// scripts/generate-sprites.cjs
// One-time generator: node.exe scripts/generate-sprites.cjs  (requires Windows node on WSL2)
// Output: public/assets/sprites/*.png
//
// Canvas size = R*2 for each entity so sprite.width/height = R*2 maps 1:1.
// Transparent background is automatic (canvas starts fully transparent).
// Replace PNGs with real pixel art for Phase C — no code changes needed.

const { createCanvas } = require('canvas')
const fs   = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '../public/assets/sprites')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ─── Helpers ─────────────────────────────────────────────────────────────────

function save(canvas, name) {
  const file   = path.join(OUT_DIR, name + '.png')
  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(file, buffer)
  console.log('  wrote', name + '.png')
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lighten(hex, amount = 60) {
  const [r, g, b] = hexToRgb(hex)
  const clamp = v => Math.min(255, v + amount)
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`
}

// ─── Shape drawing ────────────────────────────────────────────────────────────
// cx/cy = center of canvas = R so shapes are drawn exactly at the radius boundary.

function drawShape(ctx, cx, cy, R, shape, fillColor, strokeColor, strokeWidth = 2) {
  ctx.fillStyle   = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth   = strokeWidth
  ctx.beginPath()

  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, R - strokeWidth / 2, 0, Math.PI * 2)
      break

    case 'square':
      ctx.rect(strokeWidth / 2, strokeWidth / 2, R * 2 - strokeWidth, R * 2 - strokeWidth)
      break

    case 'triangle':
      // Points right — mirrors PlayerSprite: poly([R,0, -R,-R*0.85, -R,R*0.85])
      ctx.moveTo(cx + R - strokeWidth, cy)
      ctx.lineTo(cx - R + strokeWidth, cy - (R - strokeWidth) * 0.85)
      ctx.lineTo(cx - R + strokeWidth, cy + (R - strokeWidth) * 0.85)
      ctx.closePath()
      break

    case 'pentagon': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * (R - strokeWidth)
        const y = cy + Math.sin(a) * (R - strokeWidth)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }

    case 'diamond':
      ctx.moveTo(cx,                    cy - R + strokeWidth)
      ctx.lineTo(cx + R * 0.7 - strokeWidth, cy)
      ctx.lineTo(cx,                    cy + R - strokeWidth)
      ctx.lineTo(cx - R * 0.7 + strokeWidth, cy)
      ctx.closePath()
      break

    case 'arrow':
      // Arrow/chevron shape
      ctx.moveTo(cx,                    cy - R + strokeWidth)
      ctx.lineTo(cx + R * 0.6,          cy + R * 0.5)
      ctx.lineTo(cx,                    cy + R * 0.2)
      ctx.lineTo(cx - R * 0.6,          cy + R * 0.5)
      ctx.closePath()
      break

    case 'cross': {
      const arm = R * 0.35
      ctx.rect(cx - arm, cy - R + strokeWidth, arm * 2, R * 2 - strokeWidth * 2)
      ctx.rect(cx - R + strokeWidth, cy - arm, R * 2 - strokeWidth * 2, arm * 2)
      break
    }
  }

  ctx.fill()
  if (strokeColor) ctx.stroke()
}

// Forward-facing dot baked into the sprite so it rotates with the body.
// Drawn at the right-centre of the sprite (mirrors the Graphics dot at (R-4, 0)).
function drawFrontDot(ctx, cx, cy, R) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx + R - 4, cy, 3, 0, Math.PI * 2)
  ctx.fill()
}

// ─── Player sprites (10) ──────────────────────────────────────────────────────
// Canvas = R*2 × R*2 so sprite.width = R*2 maps 1:1 with no scaling artifacts.

const PLAYER_R = 20

// Warlock and DeathKnight fall back to 'pentagon' (PlayerSprite.js line 122: ?? 'pentagon')
const PLAYER_CLASSES = [
  { key: 'player_warrior',     shape: 'square',   color: '#3498db' },
  { key: 'player_paladin',     shape: 'square',   color: '#f39c12' },
  { key: 'player_shaman',      shape: 'pentagon', color: '#9b59b6' },
  { key: 'player_hunter',      shape: 'triangle', color: '#27ae60' },
  { key: 'player_priest',      shape: 'circle',   color: '#ecf0f1' },
  { key: 'player_mage',        shape: 'circle',   color: '#e74c3c' },
  { key: 'player_druid',       shape: 'pentagon', color: '#16a085' },
  { key: 'player_rogue',       shape: 'triangle', color: '#34495e' },
  { key: 'player_warlock',     shape: 'pentagon', color: '#8b5cf6' },
  { key: 'player_deathknight', shape: 'pentagon', color: '#60a5fa' },
]

console.log('Generating player sprites...')
for (const cls of PLAYER_CLASSES) {
  const size   = PLAYER_R * 2   // 40×40 — matches sprite.width = R*2 in PlayerSprite.js
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')
  const cx     = PLAYER_R
  const cy     = PLAYER_R
  drawShape(ctx, cx, cy, PLAYER_R, cls.shape, cls.color, '#ffffff', 2)
  drawFrontDot(ctx, cx, cy, PLAYER_R)
  save(canvas, cls.key)
}

// ─── Enemy sprites (6) ────────────────────────────────────────────────────────
// Canvas = R*2 × R*2 per enemy type (sizes vary).

const ENEMIES = [
  { key: 'enemy_gaterepairer',    shape: 'square',   color: '#8b4513', R: 13 },
  { key: 'enemy_leviathan',       shape: 'circle',   color: '#2e8b57', R: 50 },
  { key: 'enemy_warlock',         shape: 'diamond',  color: '#6a0dad', R: 14 },
  { key: 'enemy_flameofazzinoth', shape: 'circle',   color: '#ff5500', R: 40 },
  { key: 'enemy_shadowdemon',     shape: 'diamond',  color: '#7700cc', R: 18 },
  { key: 'enemy_shadowfiend',     shape: 'triangle', color: '#440088', R: 16 },
]

console.log('Generating enemy sprites...')
for (const e of ENEMIES) {
  const size   = e.R * 2
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')
  drawShape(ctx, e.R, e.R, e.R, e.shape, e.color, lighten(e.color), 1)
  save(canvas, e.key)
}

// ─── Boss sprites (2) ─────────────────────────────────────────────────────────
// Illidan canvas is larger to accommodate wings that extend beyond hitbox radius.
// The display size in BossSprite.js must match these canvas sizes.

const BOSS_R = 60

console.log('Generating boss sprites...')

// Illidan Stormrage
// Wings extend R*1.6 = 96px above body center. To keep anchor(0.5,0.5) aligned,
// the body center must be the PNG center, so height = 2 * max(above, below).
// above = R*1.6 = 96px + 14 margin = 110px → H = 220, cy = 110
// Width only needs body diameter (wings are narrower than the body circle).
{
  const W  = BOSS_R * 2    // 120px — wings don't exceed body width horizontally
  const H  = 220            // body centered at cy=110 so wings clear the top edge
  const cx = W / 2          // 60
  const cy = H / 2          // 110 — PNG center = body center → anchor(0.5,0.5) works

  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d')

  // Left wing
  ctx.fillStyle = 'rgba(74,0,0,0.9)'
  ctx.beginPath()
  ctx.moveTo(cx - BOSS_R * 0.4, cy - BOSS_R)
  ctx.lineTo(cx - BOSS_R * 0.8, cy - BOSS_R * 1.6)
  ctx.lineTo(cx - BOSS_R * 0.2, cy - BOSS_R * 0.7)
  ctx.closePath()
  ctx.fill()

  // Right wing
  ctx.beginPath()
  ctx.moveTo(cx + BOSS_R * 0.4, cy - BOSS_R)
  ctx.lineTo(cx + BOSS_R * 0.8, cy - BOSS_R * 1.6)
  ctx.lineTo(cx + BOSS_R * 0.2, cy - BOSS_R * 0.7)
  ctx.closePath()
  ctx.fill()

  // Body circle
  ctx.fillStyle = '#8b0000'
  ctx.strokeStyle = '#ff2222'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, BOSS_R - 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Green eyes
  ctx.fillStyle = '#00ff66'
  ctx.beginPath()
  ctx.arc(cx - BOSS_R * 0.28, cy - BOSS_R * 0.18, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + BOSS_R * 0.28, cy - BOSS_R * 0.18, 6, 0, Math.PI * 2)
  ctx.fill()

  drawFrontDot(ctx, cx, cy, BOSS_R)
  save(canvas, 'boss_illidan')
  console.log(`    boss_illidan canvas: ${W}×${H} (body center at cx=${cx}, cy=${cy})`)
}

// Shade of Akama — no wings, canvas = R*2 × R*2
{
  const size   = BOSS_R * 2   // 120×120
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')
  const cx     = BOSS_R
  const cy     = BOSS_R

  // Body circle
  ctx.fillStyle = '#2d1b4e'
  ctx.strokeStyle = '#6a3d9a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, BOSS_R - 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Shadow wisps
  ctx.fillStyle = 'rgba(45,27,78,0.5)'
  ctx.beginPath()
  ctx.arc(cx - BOSS_R * 0.3, cy - BOSS_R * 0.3, BOSS_R * 0.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(45,27,78,0.6)'
  ctx.beginPath()
  ctx.arc(cx + BOSS_R * 0.25, cy + BOSS_R * 0.2, BOSS_R * 0.35, 0, Math.PI * 2)
  ctx.fill()

  // Ghostly eyes
  ctx.fillStyle = '#ccccff'
  ctx.beginPath()
  ctx.arc(cx - BOSS_R * 0.25, cy - BOSS_R * 0.18, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + BOSS_R * 0.25, cy - BOSS_R * 0.18, 5, 0, Math.PI * 2)
  ctx.fill()

  save(canvas, 'boss_akama')
  console.log(`    boss_akama canvas: ${size}×${size}`)
}

// ─── Projectile sprite (1) ────────────────────────────────────────────────────

console.log('Generating projectile sprite...')
{
  const R      = 8
  const size   = R * 2   // 16×16
  const canvas = createCanvas(size, size)
  const ctx    = canvas.getContext('2d')
  ctx.globalAlpha = 0.92
  ctx.fillStyle   = '#ffff00'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.arc(R, R, R - 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  save(canvas, 'projectile_default')
}

console.log('\nDone! 24 sprites written to public/assets/sprites/')
