import { describe, it, expect, beforeEach } from '@jest/globals';
import MeleeAttack from './MeleeAttack.js';
import Ability from './Ability.js';

describe('MeleeAttack - Refactoring Verification', () => {
  let config;

  beforeEach(() => {
    config = {
      x: 100,
      y: 200,
      owner: { id: 'player1' },
      direction: { x: 1, y: 0 }
    };
  });

  describe('Inheritance', () => {
    it('should extend Ability base class', () => {
      const melee = new MeleeAttack(config);
      expect(melee).toBeInstanceOf(Ability);
      expect(melee).toBeInstanceOf(MeleeAttack);
    });
  });

  describe('Constructor - Base Properties', () => {
    it('should initialize base properties from config', () => {
      const melee = new MeleeAttack(config);
      expect(melee.x).toBe(100);
      expect(melee.y).toBe(200);
      expect(melee.owner).toEqual({ id: 'player1' });
      expect(melee.isAlive).toBe(true);
      expect(melee.createdAt).toBeDefined();
      expect(typeof melee.createdAt).toBe('number');
    });

    it('should use default values for optional base properties', () => {
      const melee = new MeleeAttack(config);
      expect(melee.lifetime).toBe(200);
      expect(melee.radius).toBe(20);
      expect(melee.color).toBe('#ff6b6b');
    });

    it('should accept custom base property values', () => {
      const customConfig = {
        ...config,
        lifetime: 500,
        radius: 30,
        color: '#00ff00'
      };
      const melee = new MeleeAttack(customConfig);
      expect(melee.lifetime).toBe(500);
      expect(melee.radius).toBe(30);
      expect(melee.color).toBe('#00ff00');
    });
  });

  describe('Constructor - Melee-Specific Properties', () => {
    it('should initialize melee-specific properties with defaults', () => {
      const melee = new MeleeAttack(config);
      expect(melee.damage).toBe(15);
      expect(melee.range).toBe(80);
      expect(melee.coneAngle).toBe(Math.PI / 3);
      expect(melee.direction).toEqual({ x: 1, y: 0 });
      expect(melee.duration).toBe(200);
    });

    it('should calculate angle from direction vector', () => {
      const melee = new MeleeAttack(config);
      expect(melee.angle).toBe(Math.atan2(0, 1));
      expect(melee.angle).toBe(0);
    });

    it('should calculate angle correctly for different directions', () => {
      const upConfig = { ...config, direction: { x: 0, y: -1 } };
      const meleeUp = new MeleeAttack(upConfig);
      expect(meleeUp.angle).toBe(Math.atan2(-1, 0));

      const downConfig = { ...config, direction: { x: 0, y: 1 } };
      const meleeDown = new MeleeAttack(downConfig);
      expect(meleeDown.angle).toBe(Math.atan2(1, 0));
    });

    it('should accept custom melee-specific values', () => {
      const customConfig = {
        ...config,
        damage: 25,
        range: 100,
        angle: Math.PI / 2,
        duration: 300
      };
      const melee = new MeleeAttack(customConfig);
      expect(melee.damage).toBe(25);
      expect(melee.range).toBe(100);
      expect(melee.coneAngle).toBe(Math.PI / 2);
      expect(melee.duration).toBe(300);
    });
  });

  describe('Methods', () => {
    it('should have update method', () => {
      const melee = new MeleeAttack(config);
      expect(typeof melee.update).toBe('function');
      melee.update(16);
      expect(melee.isAlive).toBe(true);
    });

    it('should have render method', () => {
      const melee = new MeleeAttack(config);
      expect(typeof melee.render).toBe('function');
    });

    it('should have checkCollision method', () => {
      const melee = new MeleeAttack(config);
      expect(typeof melee.checkCollision).toBe('function');
    });

    it('should have destroy method from base class', () => {
      const melee = new MeleeAttack(config);
      expect(typeof melee.destroy).toBe('function');
      melee.destroy();
      expect(melee.isAlive).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing usage patterns', () => {
      // Simulating how MeleeHandler creates melee attacks
      const meleeAttack = new MeleeAttack({
        x: 100,
        y: 100,
        damage: 20,
        range: 80,
        angle: Math.PI / 3,
        direction: { x: 1, y: 0 },
        color: '#ff6b6b',
        owner: { id: 'player1' },
        lifetime: 200,
        duration: 200
      });

      expect(meleeAttack.isAlive).toBe(true);
      expect(meleeAttack.x).toBe(100);
      expect(meleeAttack.y).toBe(100);
      expect(meleeAttack.damage).toBe(20);
      expect(meleeAttack.range).toBe(80);
    });

    it('should maintain collision detection behavior', () => {
      const melee = new MeleeAttack(config);
      const target = { x: 110, y: 200, radius: 20 };
      
      // Target is within range (distance = 10, combined radius = 40)
      expect(melee.checkCollision(target)).toBe(true);
    });

    it('should expire after lifetime', (done) => {
      const shortLifetimeConfig = {
        ...config,
        lifetime: 50
      };
      const melee = new MeleeAttack(shortLifetimeConfig);
      
      expect(melee.isAlive).toBe(true);
      
      setTimeout(() => {
        melee.update(16);
        expect(melee.isAlive).toBe(false);
        done();
      }, 60);
    });
  });

  describe('Edge Cases', () => {
    describe('Invalid direction vectors', () => {
      it('should handle zero direction vector gracefully', () => {
        const zeroDirectionConfig = {
          ...config,
          direction: { x: 0, y: 0 }
        };
        const melee = new MeleeAttack(zeroDirectionConfig);
        
        // Should still create the attack
        expect(melee.isAlive).toBe(true);
        expect(melee.direction).toEqual({ x: 0, y: 0 });
        // Angle should be 0 for zero vector (atan2(0, 0) = 0)
        expect(melee.angle).toBe(0);
      });

      it('should handle negative direction vectors', () => {
        const negativeConfig = {
          ...config,
          direction: { x: -1, y: -1 }
        };
        const melee = new MeleeAttack(negativeConfig);
        
        expect(melee.isAlive).toBe(true);
        expect(melee.direction).toEqual({ x: -1, y: -1 });
        expect(melee.angle).toBe(Math.atan2(-1, -1));
      });

      it('should handle undefined direction by using default', () => {
        const noDirectionConfig = {
          x: 100,
          y: 200,
          owner: { id: 'player1' }
        };
        const melee = new MeleeAttack(noDirectionConfig);
        
        expect(melee.direction).toEqual({ x: 1, y: 0 });
        expect(melee.angle).toBe(0);
      });

      it('should handle very small direction values', () => {
        const smallDirectionConfig = {
          ...config,
          direction: { x: 0.001, y: 0.001 }
        };
        const melee = new MeleeAttack(smallDirectionConfig);
        
        expect(melee.isAlive).toBe(true);
        expect(melee.angle).toBe(Math.atan2(0.001, 0.001));
      });
    });

    describe('Collision at exact range boundary', () => {
      it('should detect collision when target is exactly at combined radius distance', () => {
        const melee = new MeleeAttack({
          x: 100,
          y: 100,
          owner: { id: 'player1' },
          radius: 20,
          direction: { x: 1, y: 0 }
        });
        
        // Target at exactly combined radius distance (20 + 20 = 40)
        const target = {
          x: 140,
          y: 100,
          radius: 20
        };
        
        const distance = Math.sqrt((140 - 100) ** 2 + (100 - 100) ** 2);
        expect(distance).toBe(40);
        
        // At exact boundary, should NOT collide (distance < sumOfRadii is false)
        expect(melee.checkCollision(target)).toBe(false);
      });

      it('should detect collision when target is just inside range boundary', () => {
        const melee = new MeleeAttack({
          x: 100,
          y: 100,
          owner: { id: 'player1' },
          radius: 20,
          direction: { x: 1, y: 0 }
        });
        
        // Target just inside boundary (distance = 39.9, combined radius = 40)
        const target = {
          x: 139.9,
          y: 100,
          radius: 20
        };
        
        expect(melee.checkCollision(target)).toBe(true);
      });

      it('should not detect collision when target is just outside range boundary', () => {
        const melee = new MeleeAttack({
          x: 100,
          y: 100,
          owner: { id: 'player1' },
          radius: 20,
          direction: { x: 1, y: 0 }
        });
        
        // Target just outside boundary (distance = 40.1, combined radius = 40)
        const target = {
          x: 140.1,
          y: 100,
          radius: 20
        };
        
        expect(melee.checkCollision(target)).toBe(false);
      });

      it('should handle collision with target that has no radius property', () => {
        const melee = new MeleeAttack({
          x: 100,
          y: 100,
          owner: { id: 'player1' },
          radius: 20,
          direction: { x: 1, y: 0 }
        });
        
        // Target without radius property (should use default 20)
        const target = {
          x: 110,
          y: 100
        };
        
        // Distance = 10, combined radius = 20 + 20 = 40
        expect(melee.checkCollision(target)).toBe(true);
      });
    });

    describe('Lifetime expiration timing', () => {
      it('should remain alive just before lifetime expires', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 100
        });
        
        expect(melee.isAlive).toBe(true);
        
        // Mock time to be just before expiration (at 90ms)
        const originalNow = Date.now;
        Date.now = jest.fn(() => melee.createdAt + 90);
        
        melee.update(16);
        expect(melee.isAlive).toBe(true);
        
        // Restore Date.now
        Date.now = originalNow;
      });

      it('should expire exactly at lifetime threshold', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 100
        });
        
        expect(melee.isAlive).toBe(true);
        
        // Mock time to be exactly at lifetime (100ms) - should still be alive since code uses >
        const originalNow = Date.now;
        Date.now = jest.fn(() => melee.createdAt + 100);
        
        melee.update(16);
        expect(melee.isAlive).toBe(true); // Still alive at exactly threshold
        
        // Now mock time to be just past threshold
        Date.now = jest.fn(() => melee.createdAt + 101);
        melee.update(16);
        expect(melee.isAlive).toBe(false); // Now expired
        
        // Restore Date.now
        Date.now = originalNow;
      });

      it('should expire after lifetime threshold', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 100
        });
        
        expect(melee.isAlive).toBe(true);
        
        // Mock time to be after lifetime (at 110ms)
        const originalNow = Date.now;
        Date.now = jest.fn(() => melee.createdAt + 110);
        
        melee.update(16);
        expect(melee.isAlive).toBe(false);
        
        // Restore Date.now
        Date.now = originalNow;
      });

      it('should not update when already dead', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 100
        });
        
        melee.destroy();
        expect(melee.isAlive).toBe(false);
        
        // Update should not throw error or change state
        melee.update(16);
        expect(melee.isAlive).toBe(false);
      });

      it('should handle very short lifetime', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 10
        });
        
        expect(melee.isAlive).toBe(true);
        
        // Mock time to be past the short lifetime
        const originalNow = Date.now;
        Date.now = jest.fn(() => melee.createdAt + 15);
        
        melee.update(16);
        expect(melee.isAlive).toBe(false);
        
        // Restore Date.now
        Date.now = originalNow;
      });

      it('should not expire if update is never called', () => {
        const melee = new MeleeAttack({
          ...config,
          lifetime: 50
        });
        
        expect(melee.isAlive).toBe(true);
        
        // Mock time to be past lifetime
        const originalNow = Date.now;
        Date.now = jest.fn(() => melee.createdAt + 60);
        
        // Don't call update - should still be alive because update wasn't called
        expect(melee.isAlive).toBe(true);
        
        // Restore Date.now
        Date.now = originalNow;
      });
    });
  });
});

/**
 * Property-based tests for the MeleeAttack class
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';

describe('MeleeAttack Class - Property Tests', () => {
  
  // Feature: base-ability-class, Property 10: MeleeAttack constructor initialization
  // **Validates: Requirements 3.3**
  it('Property 10: MeleeAttack constructor initialization - all properties correctly initialized with angle calculated from direction', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          damage: fc.integer({ min: 1, max: 100 }),
          range: fc.integer({ min: 20, max: 200 }),
          angle: fc.float({ min: 0, max: Math.fround(Math.PI) }),
          direction: fc.record({
            x: fc.float({ min: -1, max: 1 }),
            y: fc.float({ min: -1, max: 1 })
          }).filter(dir => {
            // Ensure non-zero direction and no NaN values
            const hasValidValues = !isNaN(dir.x) && !isNaN(dir.y);
            const isNonZero = dir.x !== 0 || dir.y !== 0;
            return hasValidValues && isNonZero;
          }),
          duration: fc.integer({ min: 100, max: 1000 }),
          lifetime: fc.integer({ min: 100, max: 1000 }),
          radius: fc.integer({ min: 10, max: 50 }),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
        }),
        (config) => {
          const melee = new MeleeAttack(config);
          
          // Verify base properties from Ability
          expect(melee.x).toBe(config.x);
          expect(melee.y).toBe(config.y);
          expect(melee.owner).toBe(config.owner);
          expect(melee.lifetime).toBe(config.lifetime);
          expect(melee.radius).toBe(config.radius);
          expect(melee.color).toBe(config.color);
          expect(melee.isAlive).toBe(true);
          expect(typeof melee.createdAt).toBe('number');
          
          // Verify melee-specific properties
          expect(melee.damage).toBe(config.damage);
          expect(melee.range).toBe(config.range);
          expect(melee.coneAngle).toBe(config.angle);
          expect(melee.direction).toEqual(config.direction);
          expect(melee.duration).toBe(config.duration);
          
          // Verify angle is calculated from direction vector
          const expectedAngle = Math.atan2(config.direction.y, config.direction.x);
          expect(melee.angle).toBeCloseTo(expectedAngle, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 11: MeleeAttack collision detection
  // **Validates: Requirements 3.6**
  it('Property 11: MeleeAttack collision detection - returns true when target is within range', () => {
    fc.assert(
      fc.property(
        fc.record({
          meleeX: fc.integer({ min: 100, max: 900 }),
          meleeY: fc.integer({ min: 100, max: 600 }),
          meleeRadius: fc.integer({ min: 10, max: 30 }),
          targetX: fc.integer({ min: 100, max: 900 }),
          targetY: fc.integer({ min: 100, max: 600 }),
          targetRadius: fc.integer({ min: 10, max: 30 })
        }),
        (config) => {
          const melee = new MeleeAttack({
            x: config.meleeX,
            y: config.meleeY,
            owner: { id: 'test-owner' },
            radius: config.meleeRadius,
            direction: { x: 1, y: 0 }
          });
          
          const target = {
            x: config.targetX,
            y: config.targetY,
            radius: config.targetRadius
          };
          
          // Calculate actual distance
          const dx = config.meleeX - config.targetX;
          const dy = config.meleeY - config.targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sumOfRadii = config.meleeRadius + config.targetRadius;
          
          // Check collision
          const collisionResult = melee.checkCollision(target);
          
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

  // Feature: base-ability-class, Property 17: Lifetime expiration
  // **Validates: Requirements 3.4**
  it('Property 17: Lifetime expiration - isAlive becomes false when lifetime expires', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          lifetime: fc.integer({ min: 50, max: 500 }),
          direction: fc.constant({ x: 1, y: 0 })
        }),
        (config) => {
          const melee = new MeleeAttack(config);
          
          expect(melee.isAlive).toBe(true);
          
          // Simulate time passing beyond lifetime
          const originalNow = Date.now;
          Date.now = jest.fn(() => melee.createdAt + config.lifetime + 10);
          
          melee.update(16);
          
          // Verify melee attack is no longer alive
          expect(melee.isAlive).toBe(false);
          
          // Restore Date.now
          Date.now = originalNow;
        }
      ),
      { numRuns: 100 }
    );
  });
});
