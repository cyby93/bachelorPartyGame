import { INPUT_CONFIG } from '../Constants.js';

class InputManager {
  constructor(socket) {
    this.socket = socket;
    this.moveJoystick = null;
    this.skillJoysticks = [];
    this.skillTouchStart = [0, 0, 0, 0];
    this.skillCooldowns = [0, 0, 0, 0];
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
      if (!cell) continue;
      let touchStartTime = 0;
      let touchStartPos = { x: 0, y: 0 };
      let joystick = null;
      let isDragging = false;
      let holdInterval = null;

      cell.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.skillCooldowns[i] > Date.now()) {
          return;
        }
        touchStartTime = Date.now();
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        isDragging = false;

        // Create joystick
        joystick = nipplejs.create({
          zone: cell,
          mode: 'static',
          position: { left: '50%', top: '50%' },
          color: 'rgba(255, 255, 255, 0.7)',
          size: 80
        });

        // Send START action
        this.socket.emit('player_input', {
          skill: i,
          inputData: {
            action: 'START',
            vector: { x: 1, y: 0 },
            intensity: 0
          }
        });

        // Set up HOLD updates for cast abilities
        holdInterval = setInterval(() => {
          if (joystick) {
            const data = joystick.get();
            let vector = { x: 1, y: 0 };
            let intensity = 0;

            if (data && data.vector) {
              vector = {
                x: data.vector.x,
                y: -data.vector.y
              };
              intensity = Math.min(1, data.distance / (INPUT_CONFIG.JOYSTICK_SIZE * 0.8));
            }

            this.socket.emit('player_input', {
              skill: i,
              inputData: {
                action: 'HOLD',
                vector: vector,
                intensity: intensity
              }
            });
          }
        }, 50);  // Update every 50ms

        joystick.on('move', (evt, data) => {
          isDragging = true;
        });
      });

      cell.addEventListener('touchend', (e) => {
        e.preventDefault();
        
        // Clear hold interval
        if (holdInterval) {
          clearInterval(holdInterval);
          holdInterval = null;
        }

        const touchDuration = Date.now() - touchStartTime;
        
        if (joystick) {
          const data = joystick.get();
          let vector = { x: 1, y: 0 };
          let intensity = 0;

          if (isDragging && data && data.vector) {
            if (data.distance < INPUT_CONFIG.JOYSTICK_SIZE * INPUT_CONFIG.DEADZONE) {
              console.log(`Skill ${i} cancelled`);
              joystick.destroy();
              return;
            }
            vector = {
              x: data.vector.x,
              y: -data.vector.y
            };
            intensity = Math.min(1, data.distance / (INPUT_CONFIG.JOYSTICK_SIZE * 0.8));
          }

          // Send RELEASE action
          this.socket.emit('player_input', {
            skill: i,
            inputData: {
              action: 'RELEASE',
              vector: vector,
              intensity: intensity
            }
          });

          joystick.destroy();
        }
      });

      cell.addEventListener('touchcancel', (e) => {
        if (holdInterval) {
          clearInterval(holdInterval);
          holdInterval = null;
        }
        if (joystick) {
          joystick.destroy();
        }
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
    this.skillJoysticks.forEach(j => j && j.destroy());
  }
}

export default InputManager;
