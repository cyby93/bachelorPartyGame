/**
 * Property-based tests for the Projectile class
 * Uses fast-check for property-based testing
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import fc from 'fast-check';
import Projectile from './Projectile.js';
import { GAME_CONFIG } from '../Constants.js';

describe('Projectile Class - Property Tests', () => {
  
  // Feature: base-ability-class, Property 4: Projectile constructor initialization
  // **Validates: Requirements 2.3**
  test('Property 4: Projectile constructor initialization - all properties correctly initialized', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          vx: fc.integer({ min: -10, max: 10 }),
          vy: fc.integer({ min: -10, max: 10 }),
          damage: fc.integer({ min: 1, max: 100 }),
          pierce: fc.boolean(),
          range: fc.integer({ min: 100, max: 1000 }),
          lifetime: fc.integer({ min: 1000, max: 30000 }),
          radius: fc.integer({ min: 5, max: 20 }),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s),
          healAmount: fc.integer({ min: 0, max: 50 }),
          effectType: fc.constantFrom('DAMAGE', 'HEAL')
        }),
        (config) => {
          const projectile = new Projectile(config);
          
          // Verify base properties from Ability
          expect(projectile.x).toBe(config.x);
          expect(projectile.y).toBe(config.y);
          expect(projectile.owner).toBe(config.owner);
          expect(projectile.lifetime).toBe(config.lifetime);
          expect(projectile.radius).toBe(config.radius);
          expect(projectile.color).toBe(config.color);
          expect(projectile.isAlive).toBe(true);
          expect(typeof projectile.createdAt).toBe('number');
          
          // Verify projectile-specific properties
          expect(projectile.vx).toBe(config.vx);
          expect(projectile.vy).toBe(config.vy);
          expect(projectile.damage).toBe(config.damage);
          expect(projectile.pierce).toBe(config.pierce);
          expect(projectile.range).toBe(config.range);
          expect(projectile.healAmount).toBe(config.healAmount);
          expect(projectile.effectType).toBe(config.effectType);
          expect(projectile.distanceTraveled).toBe(0);
          
          // Verify speed is calculated correctly
          const expectedSpeed = Math.sqrt(config.vx * config.vx + config.vy * config.vy);
          expect(projectile.speed).toBeCloseTo(expectedSpeed, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 5: Projectile movement
  // **Validates: Requirements 2.4**
  test('Property 5: Projectile movement - position changes by velocity on update', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 100, max: 900 }),
          y: fc.integer({ min: 100, max: 600 }),
          owner: fc.constant({ id: 'test-owner' }),
          vx: fc.integer({ min: -10, max: 10 }).filter(v => v !== 0),
          vy: fc.integer({ min: -10, max: 10 }).filter(v => v !== 0),
          range: fc.constant(10000) // Large range to avoid range limit
        }),
        (config) => {
          const projectile = new Projectile(config);
          const initialX = projectile.x;
          const initialY = projectile.y;
          
          // Call update
          projectile.update(16);
          
          // Verify position changed by velocity
          expect(projectile.x).toBe(initialX + config.vx);
          expect(projectile.y).toBe(initialY + config.vy);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 6: Projectile range limit
  // **Validates: Requirements 2.4**
  test('Property 6: Projectile range limit - isAlive becomes false when range exceeded', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 100, max: 900 }),
          y: fc.integer({ min: 100, max: 600 }),
          owner: fc.constant({ id: 'test-owner' }),
          vx: fc.integer({ min: 1, max: 10 }),
          vy: fc.integer({ min: 1, max: 10 }),
          range: fc.integer({ min: 10, max: 100 })
        }),
        (config) => {
          const projectile = new Projectile(config);
          const speed = Math.sqrt(config.vx * config.vx + config.vy * config.vy);
          
          // Calculate how many updates needed to exceed range
          const updatesNeeded = Math.ceil(config.range / speed) + 1;
          
          // Update until range should be exceeded
          for (let i = 0; i < updatesNeeded; i++) {
            projectile.update(16);
          }
          
          // Verify projectile is no longer alive
          expect(projectile.isAlive).toBe(false);
          expect(projectile.distanceTraveled).toBeGreaterThanOrEqual(config.range);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 7: Projectile boundary checking
  // **Validates: Requirements 2.4**
  test('Property 7: Projectile boundary checking - isAlive becomes false when out of bounds', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Test left boundary
          { x: 5, y: 400, vx: -10, vy: 0 },
          // Test right boundary
          { x: GAME_CONFIG.CANVAS_WIDTH - 5, y: 400, vx: 10, vy: 0 },
          // Test top boundary
          { x: 500, y: 5, vx: 0, vy: -10 },
          // Test bottom boundary
          { x: 500, y: GAME_CONFIG.CANVAS_HEIGHT - 5, vx: 0, vy: 10 }
        ),
        (config) => {
          const projectile = new Projectile({
            ...config,
            owner: { id: 'test-owner' },
            range: 10000 // Large range to avoid range limit
          });
          
          // Update once to move out of bounds
          projectile.update(16);
          
          // Verify projectile is no longer alive
          expect(projectile.isAlive).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 8: Projectile collision detection
  // **Validates: Requirements 2.6**
  test('Property 8: Projectile collision detection - returns true when distance < sum of radii', () => {
    fc.assert(
      fc.property(
        fc.record({
          projectileX: fc.integer({ min: 100, max: 900 }),
          projectileY: fc.integer({ min: 100, max: 600 }),
          projectileRadius: fc.integer({ min: 5, max: 20 }),
          targetX: fc.integer({ min: 100, max: 900 }),
          targetY: fc.integer({ min: 100, max: 600 }),
          targetRadius: fc.integer({ min: 10, max: 30 })
        }),
        (config) => {
          const projectile = new Projectile({
            x: config.projectileX,
            y: config.projectileY,
            owner: { id: 'test-owner' },
            radius: config.projectileRadius,
            vx: 1,
            vy: 0
          });
          
          const target = {
            x: config.targetX,
            y: config.targetY,
            radius: config.targetRadius
          };
          
          // Calculate actual distance
          const dx = config.projectileX - config.targetX;
          const dy = config.projectileY - config.targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sumOfRadii = config.projectileRadius + config.targetRadius;
          
          // Check collision
          const collisionResult = projectile.checkCollision(target);
          
          // Verify collision result matches distance calculation
          if (distance < sumOfRadii) {
            expect(collisionResult).toBe(true);
          } else {
            expect(collisionResult).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 9: Projectile pierce behavior
  // **Validates: Requirements 2.7**
  test('Property 9: Projectile pierce behavior - onCollision returns correct value based on pierce', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          pierce: fc.boolean()
        }),
        (config) => {
          const projectile = new Projectile(config);
          const target = { id: 'target', x: 100, y: 100 };
          
          const shouldDestroy = projectile.onCollision(target);
          
          // If pierce is true, should NOT destroy (return false)
          // If pierce is false, should destroy (return true)
          if (config.pierce) {
            expect(shouldDestroy).toBe(false);
          } else {
            expect(shouldDestroy).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Projectile Class - Unit Tests for Edge Cases', () => {
  
  // **Validates: Requirements 2.4**
  test('Zero velocity projectiles should not move', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 0,
      vy: 0,
      range: 1000
    });
    
    const initialX = projectile.x;
    const initialY = projectile.y;
    
    projectile.update(16);
    
    expect(projectile.x).toBe(initialX);
    expect(projectile.y).toBe(initialY);
    expect(projectile.distanceTraveled).toBe(0);
  });

  // **Validates: Requirements 2.4**
  test('Projectile at left boundary should be destroyed when moving left', () => {
    const projectile = new Projectile({
      x: 5,
      y: 400,
      owner: { id: 'test-owner' },
      vx: -10,
      vy: 0,
      range: 1000
    });
    
    expect(projectile.isAlive).toBe(true);
    projectile.update(16);
    expect(projectile.isAlive).toBe(false);
  });

  // **Validates: Requirements 2.4**
  test('Projectile at right boundary should be destroyed when moving right', () => {
    const projectile = new Projectile({
      x: GAME_CONFIG.CANVAS_WIDTH - 5,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 10,
      vy: 0,
      range: 1000
    });
    
    expect(projectile.isAlive).toBe(true);
    projectile.update(16);
    expect(projectile.isAlive).toBe(false);
  });

  // **Validates: Requirements 2.4**
  test('Projectile at top boundary should be destroyed when moving up', () => {
    const projectile = new Projectile({
      x: 500,
      y: 5,
      owner: { id: 'test-owner' },
      vx: 0,
      vy: -10,
      range: 1000
    });
    
    expect(projectile.isAlive).toBe(true);
    projectile.update(16);
    expect(projectile.isAlive).toBe(false);
  });

  // **Validates: Requirements 2.4**
  test('Projectile at bottom boundary should be destroyed when moving down', () => {
    const projectile = new Projectile({
      x: 500,
      y: GAME_CONFIG.CANVAS_HEIGHT - 5,
      owner: { id: 'test-owner' },
      vx: 0,
      vy: 10,
      range: 1000
    });
    
    expect(projectile.isAlive).toBe(true);
    projectile.update(16);
    expect(projectile.isAlive).toBe(false);
  });

  // **Validates: Requirements 2.6**
  test('Collision check with null target should return false', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 5,
      vy: 0
    });
    
    expect(projectile.checkCollision(null)).toBe(false);
  });

  // **Validates: Requirements 2.6**
  test('Collision check with undefined target should return false', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 5,
      vy: 0
    });
    
    expect(projectile.checkCollision(undefined)).toBe(false);
  });

  // **Validates: Requirements 2.4, 2.6**
  test('Dead projectile should not detect collisions', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 5,
      vy: 0
    });
    
    projectile.destroy();
    
    const target = {
      x: 500,
      y: 400,
      radius: 20
    };
    
    expect(projectile.checkCollision(target)).toBe(false);
  });

  // **Validates: Requirements 2.4**
  test('Projectile should be destroyed when lifetime expires', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 1,
      vy: 0,
      lifetime: 100,
      range: 10000
    });
    
    expect(projectile.isAlive).toBe(true);
    
    // Wait for lifetime to expire
    const originalNow = Date.now;
    Date.now = jest.fn(() => projectile.createdAt + 150);
    
    projectile.update(16);
    
    expect(projectile.isAlive).toBe(false);
    
    // Restore Date.now
    Date.now = originalNow;
  });

  // **Validates: Requirements 2.4**
  test('Projectile should be destroyed exactly when lifetime expires', () => {
    const projectile = new Projectile({
      x: 500,
      y: 400,
      owner: { id: 'test-owner' },
      vx: 1,
      vy: 0,
      lifetime: 1000,
      range: 10000
    });
    
    const originalNow = Date.now;
    
    // Just before expiration
    Date.now = jest.fn(() => projectile.createdAt + 999);
    projectile.update(16);
    expect(projectile.isAlive).toBe(true);
    
    // Exactly at expiration
    Date.now = jest.fn(() => projectile.createdAt + 1000);
    projectile.update(16);
    expect(projectile.isAlive).toBe(true);
    
    // Just after expiration
    Date.now = jest.fn(() => projectile.createdAt + 1001);
    projectile.update(16);
    expect(projectile.isAlive).toBe(false);
    
    // Restore Date.now
    Date.now = originalNow;
  });
});
