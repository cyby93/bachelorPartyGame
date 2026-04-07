<script>
  let { onnext } = $props()

  let name = $state('')

  function submit() {
    onnext?.(name.trim() || 'Player')
  }

  function onkeydown(e) {
    if (e.key === 'Enter') submit()
  }
</script>

<div class="name-screen">
  <div class="brand">
    <span class="icon">⚔️</span>
    <h1>RAID NIGHT</h1>
    <p class="subtitle">THE RESCUE</p>
  </div>

  <div class="form">
    <input
      type="text"
      bind:value={name}
      placeholder="Your name"
      maxlength="15"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="words"
      spellcheck="false"
      {onkeydown}
    />
    <button class="next-btn" onclick={submit}>NEXT</button>
  </div>
</div>

<style>
  .name-screen {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    padding: 24px;
  }

  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .brand .icon {
    font-size: 48px;
    line-height: 1;
  }

  h1 {
    font-size: 28px;
    color: #00d2ff;
    letter-spacing: 3px;
    margin: 0;
  }

  .subtitle {
    font-size: 14px;
    color: #7fa8c0;
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
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #1e3a4a;
    background: #16202a;
    color: #fff;
    font-size: 16px;
    text-align: center;
    box-sizing: border-box;
  }

  .next-btn {
    width: 100%;
    padding: 14px;
    border-radius: 8px;
    border: none;
    font-size: 16px;
    font-weight: bold;
    background: linear-gradient(135deg, #00d2ff, #0070a8);
    color: #fff;
    cursor: pointer;
    letter-spacing: 2px;
  }
</style>
