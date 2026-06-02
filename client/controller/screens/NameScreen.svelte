<script>
  let { onnext, initialName = '', message = '' } = $props()

  let name = $state(initialName)

  function submit() {
    if (!name.trim()) return
    onnext?.(name.trim())
  }

  function onkeydown(e) {
    if (e.key === 'Enter') submit()
  }
</script>

<div class="name-screen">
  <div class="brand-card">
    <div class="brand">
      <h1>RAID NIGHT</h1>
      {#if message}
        <p class="rejoin-message">{message}</p>
      {/if}
    </div>

    <div class="form">
      <input
        type="text"
        bind:value={name}
        placeholder="Your raid name"
        maxlength="15"
        required
        autocomplete="off"
        autocorrect="off"
        autocapitalize="words"
        spellcheck="false"
        {onkeydown}
      />
      <button class="next-btn" onclick={submit} disabled={!name.trim()}>Continue</button>
    </div>
  </div>
</div>

<style>
  .name-screen {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px;
    font-size: var(--rn-fs-name);
    background:
      radial-gradient(circle at top, rgba(200, 148, 40, 0.14) 0%, rgba(200, 148, 40, 0) 24%),
      var(--rn-gradient-bg);
  }

  .brand-card {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 20px;
    border-radius: var(--rn-radius-xl);
    border: 1px solid rgba(148, 106, 32, 0.38);
    background: rgba(26, 14, 6, 0.96);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 18px 40px rgba(0, 0, 0, 0.24);
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  h1 {
    font-family: 'LifeCraft', 'Trebuchet MS', sans-serif;
    font-size: clamp(2em, 10vw, 3.375em);
    color: var(--rn-gold);
    letter-spacing: 4px;
    margin: 0;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 280px;
  }

  input {
    width: 100%;
    padding: 13px 14px;
    border-radius: var(--rn-radius-md);
    border: 1px solid var(--rn-border-subtle);
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
    font-size: 1em;
    text-align: center;
    box-sizing: border-box;
  }

  .next-btn {
    width: 100%;
    padding: 14px;
    border-radius: var(--rn-radius-md);
    border: 1px solid rgba(160, 112, 30, 0.55);
    font-size: 0.94em;
    font-weight: bold;
    background: var(--rn-gradient-cta);
    color: var(--rn-text-bright);
    cursor: pointer;
    letter-spacing: 2px;
    transition: filter 0.12s ease, opacity 0.12s ease;
  }

  .next-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }

  .next-btn:not(:disabled):active {
    filter: brightness(1.12);
  }

  .rejoin-message {
    font-size: 0.81em;
    color: var(--rn-accent);
    text-align: center;
    margin: 4px 0 0;
  }

  @media (max-height: 430px) {
    .name-screen {
      padding: 16px;
    }

    .brand-card {
      gap: 14px;
      padding: 18px 16px;
      border-radius: var(--rn-radius-xl);
    }

    h1 {
      font-size: clamp(1.5em, 10vw, 3em);
    }

    input,
    .next-btn {
      font-size: 0.875em;
    }
  }
</style>
