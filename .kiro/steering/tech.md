# Technology Stack

## Backend
- Node.js with ES6 modules (`"type": "module"` in package.json)
- Express for HTTP server
- Socket.io for real-time WebSocket communication
- ip package for network address detection

## Frontend
- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- nipple.js for virtual joystick controls
- No build system - direct ES6 module imports

## Testing
- Jest with jsdom environment
- fast-check for property-based testing
- Test files use `.test.js` suffix and are co-located with source files

## Common Commands

```bash
# Start development server
npm start

# Run tests (single execution)
npm test

# Run tests in watch mode
npm run test:watch
```

## Server Configuration
- Default port: 3100 (configurable via PORT environment variable)
- Game state broadcast: 20 FPS (every 50ms)
- Static files served from `/public` directory

## Module System
- All JavaScript files use ES6 module syntax (`import`/`export`)
- File extensions (`.js`) must be included in import statements
- Jest configured to handle ES6 modules with `--experimental-vm-modules` flag
