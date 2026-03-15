/**
 * client/controller/main.js
 * Phase 3 — Svelte entry point. Mounts App.svelte into #app.
 */

import App from './App.svelte'

const app = new App({ target: document.getElementById('app') })

export default app
