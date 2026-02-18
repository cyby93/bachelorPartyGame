import { INPUT_CONFIG } from '../Constants.js';

class InputManager {
  constructor(socket) {
    this.socket = socket;
    this.moveJoystick = null;
    this.skillJoysticks = [];
    this.skillTouchStart = [0, 0, 0, 0];
    this.skillCooldowns = [0, 0, 0, 0];
    this.skillHoldIntervals = [null, null, null, null];
  }

  initMoveJoystick(zoneId) {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    this.moveJoystick = nipplejs.create({
      zone: zone,
      mode: 'dynamic',
      color: 'rgba(255, 255, 255, 0.5)',
      size: INPUT_CONFIG.JOYSTICK_SIZE
    });
    this.moveJoystick.on('move', (evt, data) => {
      if (data.vector) {
        this.socket.emit('player_input', {
          move: {
            x: data.vector.x,
            y: -data.vector.y
          }
        });
      }
    });
    this.moveJoystick.on('end', () => {
      this.socket.emit('player_input', {
        move: { x: 0, y: 0 }
      });
    });
  }

  initSkillGrid() {
    for (let i = 0; i < 4; i++) {
      const cell = document.querySelector(`.skill-cell.skill-${i}`);
      if (!cell) {
        console.error(`Skill cell ${i} not found during initialization`);
        continue;
      }

      // Create persistent dynamic joystick
      const joystick = nipplejs.create({
        zone: cell,
        treshold: 0.3,
        mode: 'dynamic',
        color: 'rgba(255, 255, 255, 0.7)',
        size: INPUT_CONFIG.JOYSTICK_SIZE
      });

      if (!joystick) {
        console.error(`Failed to create joystick for skill ${i}`);
        this.skillJoysticks[i] = null;
        continue;
      }

      this.skillJoysticks[i] = joystick;

      // Store current joystick state for HOLD updates
      let currentVector = { x: 1, y: 0 };
      let currentIntensity = 0;

      // Register 'start' event handler
      joystick.on('start', (evt, data) => {
        // Reset state
        currentVector = { x: 1, y: 0 };
        currentIntensity = 0;

        // Emit START action (no cooldown check - server will validate)
        this.socket.emit('player_input', {
          skill: i,
          inputData: {
            action: 'START',
            vector: { x: 1, y: 0 },
            intensity: 0
          }
        });

        // Start HOLD interval
        this.skillHoldIntervals[i] = setInterval(() => {
          this.socket.emit('player_input', {
            skill: i,
            inputData: {
              action: 'HOLD',
              vector: currentVector,
              intensity: currentIntensity
            }
          });
        }, 50);
      });

      // Register 'move' event handler
      joystick.on('move', (evt, data) => {
        if (data && data.vector) {
          // Transform vector (nipplejs uses positive Y for down, game expects negative)
          currentVector = {
            x: data.vector.x,
            y: -data.vector.y
          };
          
          // Normalize vector
          const magnitude = Math.sqrt(currentVector.x * currentVector.x + currentVector.y * currentVector.y);
          if (magnitude > 0) {
            currentVector.x /= magnitude;
            currentVector.y /= magnitude;
          }

          // Calculate intensity
          currentIntensity = Math.min(1.0, data.distance / (INPUT_CONFIG.JOYSTICK_SIZE * 0.8));
        }
      });

      // Register 'end' event handler
      joystick.on('end', (evt, data) => {
        // Clear HOLD interval
        if (this.skillHoldIntervals[i]) {
          clearInterval(this.skillHoldIntervals[i]);
          this.skillHoldIntervals[i] = null;
        }

        // Check deadzone
        if (data && data.distance < INPUT_CONFIG.JOYSTICK_SIZE * INPUT_CONFIG.DEADZONE) {
          console.log(`Skill ${i} cancelled (deadzone)`);
          return;
        }

        // Calculate final vector and intensity
        let finalVector = { x: 1, y: 0 };
        let finalIntensity = 0;

        if (data && data.vector) {
          finalVector = {
            x: data.vector.x,
            y: -data.vector.y
          };
          
          // Normalize vector
          const magnitude = Math.sqrt(finalVector.x * finalVector.x + finalVector.y * finalVector.y);
          if (magnitude > 0) {
            finalVector.x /= magnitude;
            finalVector.y /= magnitude;
          }

          finalIntensity = Math.min(1.0, data.distance / (INPUT_CONFIG.JOYSTICK_SIZE * 0.8));
        }

        // Emit RELEASE action
        this.socket.emit('player_input', {
          skill: i,
          inputData: {
            action: 'RELEASE',
            vector: finalVector,
            intensity: finalIntensity
          }
        });
      });
    }
  }

  updateCooldown(skillIndex, cooldownEnd) {
    this.skillCooldowns[skillIndex] = cooldownEnd;
    const cell = document.querySelector(`.skill-cell.skill-${skillIndex}`);
    if (!cell) return;
    const overlay = cell.querySelector('.cooldown-overlay');
    if (!overlay) return;
    const updateVisual = () => {
      const remaining = Math.max(0, cooldownEnd - Date.now());
      const total = cooldownEnd - (cooldownEnd - remaining);
      const percentage = (remaining / total) * 100;
      if (remaining > 0) {
        cell.classList.add('on-cooldown');
        overlay.style.height = `${percentage}%`;
        requestAnimationFrame(updateVisual);
      } else {
        cell.classList.remove('on-cooldown');
        overlay.style.height = '0%';
      }
    };
    updateVisual();
  }

  destroy() {
    if (this.moveJoystick) {
      this.moveJoystick.destroy();
    }
    
    // Destroy all skill joysticks
    this.skillJoysticks.forEach((joystick, index) => {
      if (joystick) {
        joystick.destroy();
      }
      
      // Clear any remaining HOLD intervals
      if (this.skillHoldIntervals[index]) {
        clearInterval(this.skillHoldIntervals[index]);
        this.skillHoldIntervals[index] = null;
      }
    });
  }
}

export default InputManager;
