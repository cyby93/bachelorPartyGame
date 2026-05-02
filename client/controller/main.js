/**
 * client/controller/main.js
 * Phase 3 — Svelte entry point. Mounts App.svelte into #app.
 */

import './styles/tokens.css'
import { mount } from 'svelte'
import App from './App.svelte'

const app = mount(App, { target: document.getElementById('app') })

export default app
