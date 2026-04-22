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
  <div class="brand-card">
    <div class="brand">
      <span class="icon">⚔️</span>
      <span class="kicker">Controller Link</span>
      <h1>RAID NIGHT</h1>
      <p class="subtitle">Enter your name and join the raid.</p>
    </div>

    <div class="form">
      <input
        type="text"
        bind:value={name}
        placeholder="Your raid name"
        maxlength="15"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="words"
        spellcheck="false"
        {onkeydown}
      />
      <button class="next-btn" onclick={submit}>CONTINUE</button>
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
    background:
      radial-gradient(circle at top, rgba(104, 149, 194, 0.18) 0%, rgba(104, 149, 194, 0) 24%),
      linear-gradient(180deg, #172330 0%, #101924 100%);
  }

  .brand-card {
    width: 100%;
    max-width: 340px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 24px 20px;
    border-radius: 22px;
    border: 1px solid rgba(104, 130, 153, 0.26);
    background:
      linear-gradient(180deg, rgba(255, 214, 143, 0.05) 0%, rgba(255, 214, 143, 0) 28%),
      linear-gradient(180deg, rgba(20, 31, 43, 0.96) 0%, rgba(11, 17, 24, 0.96) 100%);
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

  .brand .icon {
    font-size: 48px;
    line-height: 1;
  }

  .kicker {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #8ea6bc;
  }

  h1 {
    font-size: 34px;
    color: #f5fbff;
    letter-spacing: 4px;
    margin: 0;
  }

  .subtitle {
    font-size: 14px;
    color: #9eb5c8;
    line-height: 1.45;
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
    border-radius: 12px;
    border: 1px solid rgba(120, 150, 176, 0.16);
    background: rgba(255, 255, 255, 0.03);
    color: #fff;
    font-size: 16px;
    text-align: center;
    box-sizing: border-box;
  }

  .next-btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: bold;
    background: linear-gradient(135deg, #1ea6d7, #0f6994);
    color: #fff;
    cursor: pointer;
    letter-spacing: 2px;
  }

  @media (max-height: 430px) {
    .name-screen {
      padding: 16px;
    }

    .brand-card {
      gap: 14px;
      padding: 18px 16px;
      border-radius: 18px;
    }

    .brand .icon {
      font-size: 38px;
    }

    h1 {
      font-size: 28px;
    }

    .subtitle,
    input,
    .next-btn {
      font-size: 14px;
    }
  }
</style>
