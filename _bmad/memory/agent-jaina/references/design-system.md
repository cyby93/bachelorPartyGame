# RAID NIGHT Design System

## Token File

`client/controller/styles/tokens.css` — imported by `client/controller/main.js`.
Tokens are available on `:root` and cascade into all Svelte component `<style>` blocks.

The host (`index.html`) mirrors the same `:root` block inline at the top of its `<style>` tag.

---

## The One Rule

**Never write a bare hex color in a Svelte component.** Always use a `var(--rn-*)` token.
If a value doesn't have a token yet, add it to `tokens.css` first, then use it.

---

## Token Reference

### Backgrounds

| Token | Value | Use |
|-------|-------|-----|
| `--rn-bg-deep` | `#0f1923` | Base page bg, body background |
| `--rn-bg-void` | `#091018` | Absolute darkest (canvas bg) |
| `--rn-bg-base` | `#172330` | Screen gradient top |
| `--rn-bg-base-dark` | `#101924` | Screen gradient bottom |
| `--rn-bg-surface` | `#1a2734` | Card / panel top |
| `--rn-bg-surface-dark` | `#121b24` | Card / panel bottom |

### Borders

| Token | Value | Use |
|-------|-------|-----|
| `--rn-border` | `rgba(104,130,153,0.28)` | Standard card border |
| `--rn-border-subtle` | `rgba(120,150,176,0.12)` | Very subtle border, inputs |
| `--rn-border-strong` | `rgba(83,112,138,0.42)` | Sidebar cards, prominent borders |
| `--rn-border-btn` | `#1e3a4a` | Button / control border |

### Text

| Token | Value | Use |
|-------|-------|-----|
| `--rn-text-bright` | `#f5fbff` | Headings, h1, important labels |
| `--rn-text-body` | `#aac0d4` | Body copy, descriptions |
| `--rn-text-secondary` | `#99b1c4` | Subtitles, hints, secondary copy |
| `--rn-text-dim` | `#7fa8c0` | Muted labels, secondary info |
| `--rn-text-dimmer` | `#556677` | Very muted, sublabels, "waiting…" text |
| `--rn-text-label` | `#8ea6bc` | Kickers, meta, uppercase labels |

### Accents

| Token | Value | Use |
|-------|-------|-----|
| `--rn-accent` | `#00d2ff` | Primary blue — highlights, active borders, icons |
| `--rn-accent-mid` | `#1ea6d7` | CTA gradient top |
| `--rn-accent-dark` | `#0f6994` | CTA gradient bottom |
| `--rn-gold` | `#c8a96a` | Gold accent — sidebar card headers, dividers |

### Status

| Token | Value | Use |
|-------|-------|-----|
| `--rn-success` | `#2ecc71` | Correct answer, alive, positive delta |
| `--rn-success-dark` | `#27ae60` | Confirm button gradient top |
| `--rn-danger` | `#e74c3c` | Wrong answer, dead state, negative delta |
| `--rn-danger-dim` | `#f08080` | "You Died" heading, soft danger text |
| `--rn-warning` | `#f39c12` | Quiz question prompt, caution |
| `--rn-info` | `#3498db` | Selection highlight, info accent |
| `--rn-combo` | `#ffcc00` | Rogue combo pip active |

### Gradients

| Token | Value | Use |
|-------|-------|-----|
| `--rn-gradient-bg` | `linear-gradient(180deg, #172330 0%, #101924 100%)` | Screen background |
| `--rn-gradient-surface` | `linear-gradient(180deg, #1a2734 0%, #121b24 100%)` | Card / panel background |
| `--rn-gradient-cta` | `linear-gradient(135deg, #1ea6d7, #0f6994)` | Primary CTA button |
| `--rn-gradient-confirm` | `linear-gradient(135deg, #27ae60, #1e8449)` | Confirm / success button |

---

## Complex Patterns

Some patterns are intentionally left as literal values because they are context-specific and would be unreadable as tokens:

- **Warm card glow** (top-edge): `linear-gradient(180deg, rgba(255, 214, 143, 0.05) 0%, rgba(255, 214, 143, 0) 28%)` — used as the first layer of multi-gradient card backgrounds. The opacity varies (0.03–0.065) per component.
- **Class-color radial** (screen top): `radial-gradient(circle at top, color-mix(in srgb, var(--class-color, var(--rn-accent)) 14%, transparent) 0%, transparent 20%)` — always paired with `--rn-gradient-bg`.
- **Dead overlay** backdrop: `rgba(0, 0, 0, 0.84)` + red radial — unique, keep literal.

These are acceptable exceptions. Everything else must use tokens.

---

## Host UI (`index.html`)

The host's styles are all inline in `index.html`'s `<style>` block. The same `:root` tokens are mirrored there. When making host UI changes, use `var(--rn-*)` exactly as you would in Svelte.

The host's `index.html` still has many hardcoded hex values that haven't been migrated yet. Migrate sections as you touch them — don't do a bulk rewrite unless specifically asked.

---

## Adding New Tokens

1. Add the property to `client/controller/styles/tokens.css`
2. Mirror it in the `:root` block at the top of `index.html`'s `<style>` tag
3. Document it in this file under the appropriate table
4. Never add a token for a value used only once in one component — inline is fine for those
