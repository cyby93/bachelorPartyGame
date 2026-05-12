<script>
  let { label, variant = 'primary', disabled = false, onclick } = $props()
</script>

<button
  class="host-btn host-btn--{variant}"
  {disabled}
  {onclick}
>
  {label}
</button>

<style>
  .host-btn {
    width: 100%;
    padding: 11px 16px;
    border-radius: var(--rn-radius-sm);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
    border: 1px solid var(--rn-border-btn);
  }

  .host-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  /* Primary — gold/brown CTA */
  .host-btn--primary {
    background: var(--rn-gradient-cta);
    color: var(--rn-text-bright);
    border-color: rgba(160, 112, 30, 0.55);
  }
  .host-btn--primary:hover:not(:disabled) {
    border-color: var(--rn-gold);
    filter: brightness(1.12);
  }

  /* Secondary — muted, supporting action */
  .host-btn--secondary {
    background: linear-gradient(180deg, #2A1808 0%, #1C1004 100%);
    color: var(--rn-text-body);
    border-color: rgba(100, 72, 20, 0.45);
  }
  .host-btn--secondary:hover:not(:disabled) {
    border-color: rgba(148, 106, 32, 0.60);
    color: var(--rn-text-bright);
  }

  /* Danger — destructive / abort */
  .host-btn--danger {
    background: #2a0a0a;
    color: #e05050;
    border-color: #5a1a1a;
  }
  .host-btn--danger:hover:not(:disabled) {
    background: #3d0f0f;
    color: #ff7070;
    border-color: #e05050;
  }

  /* Large variant used on PLAY button in CreationScreen */
  .host-btn--large {
    padding: 16px 32px;
    font-size: 18px;
    letter-spacing: 2px;
    border-radius: var(--rn-radius-md);
    background: var(--rn-gradient-cta);
    color: var(--rn-text-bright);
    border-color: rgba(160, 112, 30, 0.65);
  }
  .host-btn--large:hover:not(:disabled) {
    border-color: var(--rn-gold);
    filter: brightness(1.15);
  }
</style>
