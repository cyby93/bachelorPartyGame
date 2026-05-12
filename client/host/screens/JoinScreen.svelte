<script>
  import { EVENTS } from '../../../shared/protocol.js'
  import { gameState } from '../stores/gameState.js'
  import HostButton from '../components/HostButton.svelte'
  import LobbyPlayerList from '../components/LobbyPlayerList.svelte'
  import DebugOptions from '../components/DebugOptions.svelte'

  let { socket } = $props()

  const players      = $derived(Object.values($gameState.players).filter(p => !p.isHost && !p.isBot))
  const bots         = $derived(Object.values($gameState.players).filter(p => p.isBot))
  const startDisabled = $derived(players.length === 0 && bots.length === 0)

  function handleStartGame() {
    socket.emit(EVENTS.START_GAME)
  }

  function handleKickPlayer(e) {
    socket.emit(EVENTS.KICK, { playerId: e.detail.playerId })
  }

  function handleSessionReset() {
    if (confirm('Exit the game? All players will be kicked and you will return to the main screen.')) {
      socket.emit(EVENTS.SESSION_RESET)
    }
  }
</script>

<div class="join-screen">
  <div class="join-header">
    <div class="kicker">Gathering Hall</div>
    <h1>RAID NIGHT</h1>
    <p class="copy">Players can join via the QR code. Hit "I am ready" to enable movement, then start the campaign.</p>
  </div>

  <div class="player-section card" onkick-player={handleKickPlayer}>
    <h3>Raid Members</h3>
    <LobbyPlayerList />
  </div>

  <div class="start-area">
    <HostButton
      label="Start Campaign"
      variant="primary"
      disabled={startDisabled}
      onclick={handleStartGame}
    />
  </div>

  <DebugOptions {socket} />

  <div class="footer-actions">
    <HostButton label="Exit Game" variant="danger" onclick={handleSessionReset} />
  </div>
</div>

<style>
  .join-screen {
    width: 260px;
    min-width: 260px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    overflow-y: auto;
    background:
      linear-gradient(180deg, rgba(80, 50, 10, 0.20) 0%, rgba(0, 0, 0, 0) 18%),
      linear-gradient(180deg, #1E1208 0%, #160C05 36%, #0E0804 100%);
    border-right: 1px solid rgba(120, 84, 28, 0.50);
    box-shadow: inset -1px 0 0 rgba(255, 210, 80, 0.06);
    box-sizing: border-box;
  }

  .join-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 6px;
  }

  .kicker {
    font-size: 10px;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--rn-text-secondary);
  }

  h1 {
    font-size: 20px;
    color: var(--rn-gold);
    letter-spacing: 2.5px;
    text-transform: uppercase;
  }

  h3 {
    font-size: 11px;
    color: var(--rn-text-dim);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .copy {
    font-size: 11px;
    line-height: 1.45;
    color: var(--rn-text-label);
  }

  .card {
    background: #1A1008;
    border: 1px solid rgba(148, 106, 32, 0.38);
    border-radius: var(--rn-radius-md);
    padding: 12px;
  }

  .player-section {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .start-area { flex-shrink: 0; }

  .util-btn {
    padding: 6px 10px;
    border-radius: var(--rn-radius-sm);
    border: 1px solid rgba(100, 72, 20, 0.40);
    background: rgba(26, 16, 8, 0.70);
    color: var(--rn-text-dim);
    font-size: 11px;
    cursor: pointer;
  }
  .util-btn:hover { color: var(--rn-text-body); border-color: var(--rn-border); }

  .footer-actions { flex-shrink: 0; margin-top: auto; }
</style>
