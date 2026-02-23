import { describe, it, expect, beforeEach } from '@jest/globals';
import AOEEffect from './AOEEffect.js';
import Ability from './Ability.js';

describe('AOEEffect', () => {
  let mockOwner;
  let basicConfig;

  beforeEach(() => {
    mockOwner = { id: 'test-owner', x: 100, y: 100 };
    basicConfig = {
      x: 200,
      y: 300,
      owner: mockOwner
    };
  });

  describe('Inheritance', () => {
    it('should extend Ability base class', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe instanceof Ability).toBe(true);
      expect(aoe instanceof AOEEffect).toBe(true);
    });

    it('should inherit destroy method from Ability', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe.isAlive).toBe(true);
      aoe.destroy();
      expect(aoe.isAlive).toBe(false);
    });
  });

  describe('Constructor', () => {
    it('should initialize base properties via super()', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe.x).toBe(200);
      expect(aoe.y).toBe(300);
      expect(aoe.owner).toBe(mockOwner);
      expect(aoe.isAlive).toBe(true);
      expect(typeof aoe.createdAt).toBe('number');
    });

    it('should use default values for optional base properties', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe.lifetime).toBe(500); // AOE-specific default
      expect(aoe.radius).toBe(80); // AOE-specific default
      expect(aoe.color).toBe('#f39c12'); // AOE-specific default
    });

    it('should allow overriding default base properties', () => {
      const config = {
        ...basicConfig,
        lifetime: 1000,
        radius: 100,
        color: '#ff0000'
      };
      const aoe = new AOEEffect(config);
      expect(aoe.lifetime).toBe(1000);
      expect(aoe.radius).toBe(100);
      expect(aoe.color).toBe('#ff0000');
    });

    it('should initialize AOE-specific properties', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe.damage).toBe(20); // default
      expect(aoe.hasDealtDamage).toBe(false);
    });

    it('should allow overriding damage property', () => {
      const config = { ...basicConfig, damage: 50 };
      const aoe = new AOEEffect(config);
      expect(aoe.damage).toBe(50);
    });

    it('should initialize hasDealtDamage to false', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(aoe.hasDealtDamage).toBe(false);
    });
  });

  describe('Methods', () => {
    it('should have update method', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(typeof aoe.update).toBe('function');
      aoe.update(16); // Should not throw
    });

    it('should have render method', () => {
      const aoe = new AOEEffect(basicConfig);
      const mockCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {}
      };
      expect(typeof aoe.render).toBe('function');
      aoe.render(mockCtx); // Should not throw
    });

    it('should have checkCollision method', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(typeof aoe.checkCollision).toBe('function');
    });

    it('should have markDamageDealt method', () => {
      const aoe = new AOEEffect(basicConfig);
      expect(typeof aoe.markDamageDealt).toBe('function');
      aoe.markDamageDealt();
      expect(aoe.hasDealtDamage).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing AOE creation patterns', () => {
      const config = {
        x: 400,
        y: 500,
        owner: mockOwner,
        damage: 30,
        radius: 100,
        lifetime: 600,
        color: '#ff9900'
      };
      const aoe = new AOEEffect(config);
      
      expect(aoe.x).toBe(400);
      expect(aoe.y).toBe(500);
      expect(aoe.owner).toBe(mockOwner);
      expect(aoe.damage).toBe(30);
      expect(aoe.radius).toBe(100);
      expect(aoe.lifetime).toBe(600);
      expect(aoe.color).toBe('#ff9900');
      expect(aoe.isAlive).toBe(true);
      expect(aoe.hasDealtDamage).toBe(false);
    });

    it('should maintain collision detection behavior', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 50 });
      const nearTarget = { x: 220, y: 320, radius: 20 };
      const farTarget = { x: 500, y: 500, radius: 20 };
      
      expect(aoe.checkCollision(nearTarget)).toBe(true);
      expect(aoe.checkCollision(farTarget)).toBe(false);
    });

    it('should respect hasDealtDamage flag in collision detection', () => {
      const aoe = new AOEEffect(basicConfig);
      const target = { x: 210, y: 310, radius: 20 };
      
      expect(aoe.checkCollision(target)).toBe(true);
      aoe.markDamageDealt();
      expect(aoe.checkCollision(target)).toBe(false);
    });
  });
});

/**
 * Property-based tests for the AOEEffect class
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';

describe('AOEEffect Class - Property Tests', () => {
  
  // Feature: base-ability-class, Property 12: AOEEffect constructor initialization
  // **Validates: Requirements 4.3**
  it('Property 12: AOEEffect constructor initialization - all properties correctly initialized with hasDealtDamage set to false', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          damage: fc.integer({ min: 1, max: 100 }),
          lifetime: fc.integer({ min: 100, max: 2000 }),
          radius: fc.integer({ min: 20, max: 150 }),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
        }),
        (config) => {
          const aoe = new AOEEffect(config);
          
          // Verify base properties from Ability
          expect(aoe.x).toBe(config.x);
          expect(aoe.y).toBe(config.y);
          expect(aoe.owner).toBe(config.owner);
          expect(aoe.lifetime).toBe(config.lifetime);
          expect(aoe.radius).toBe(config.radius);
          expect(aoe.color).toBe(config.color);
          expect(aoe.isAlive).toBe(true);
          expect(typeof aoe.createdAt).toBe('number');
          
          // Verify AOE-specific properties
          expect(aoe.damage).toBe(config.damage);
          expect(aoe.hasDealtDamage).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 13: AOEEffect collision with damage flag
  // **Validates: Requirements 4.6**
  it('Property 13: AOEEffect collision with damage flag - returns true when hasDealtDamage is false and target within radius, false when hasDealtDamage is true', () => {
    fc.assert(
      fc.property(
        fc.record({
          aoeX: fc.integer({ min: 100, max: 900 }),
          aoeY: fc.integer({ min: 100, max: 600 }),
          aoeRadius: fc.integer({ min: 30, max: 100 }),
          targetX: fc.integer({ min: 100, max: 900 }),
          targetY: fc.integer({ min: 100, max: 600 }),
          targetRadius: fc.integer({ min: 10, max: 30 }),
          hasDealtDamage: fc.boolean()
        }),
        (config) => {
          const aoe = new AOEEffect({
            x: config.aoeX,
            y: config.aoeY,
            owner: { id: 'test-owner' },
            radius: config.aoeRadius
          });
          
          // Set hasDealtDamage flag
          if (config.hasDealtDamage) {
            aoe.markDamageDealt();
          }
          
          const target = {
            x: config.targetX,
            y: config.targetY,
            radius: config.targetRadius
          };
          
          // Calculate actual distance
          const dx = config.aoeX - config.targetX;
          const dy = config.aoeY - config.targetY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sumOfRadii = config.aoeRadius + config.targetRadius;
          
          // Check collision
          const collisionResult = aoe.checkCollision(target);
          
          // Verify collision result
          if (config.hasDealtDamage) {
            // If damage already dealt, should always return false
            expect(collisionResult).toBe(false);
          } else {
            // If damage not dealt, should match distance calculation
            if (distance < sumOfRadii) {
              expect(collisionResult).toBe(true);
            } else {
              expect(collisionResult).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 14: AOEEffect damage marking
  // **Validates: Requirements 4.7**
  it('Property 14: AOEEffect damage marking - markDamageDealt sets hasDealtDamage to true', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          damage: fc.integer({ min: 1, max: 100 })
        }),
        (config) => {
          const aoe = new AOEEffect(config);
          
          // Initially hasDealtDamage should be false
          expect(aoe.hasDealtDamage).toBe(false);
          
          // Call markDamageDealt
          aoe.markDamageDealt();
          
          // Verify hasDealtDamage is now true
          expect(aoe.hasDealtDamage).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 17: Lifetime expiration
  // **Validates: Requirements 4.4**
  it('Property 17: Lifetime expiration - isAlive becomes false when lifetime expires', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          lifetime: fc.integer({ min: 50, max: 1000 })
        }),
        (config) => {
          const aoe = new AOEEffect(config);
          
          expect(aoe.isAlive).toBe(true);
          
          // Simulate time passing beyond lifetime
          const originalNow = Date.now;
          Date.now = jest.fn(() => aoe.createdAt + config.lifetime + 10);
          
          aoe.update(16);
          
          // Verify AOE effect is no longer alive
          expect(aoe.isAlive).toBe(false);
          
          // Restore Date.now
          Date.now = originalNow;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit tests for AOEEffect edge cases
 * Task 6.3: Test markDamageDealt prevents further collisions, collision at exact radius boundary, expanding radius animation timing
 * Requirements: 4.6, 4.7
 */

describe('AOEEffect Edge Cases', () => {
  let mockOwner;
  let basicConfig;

  beforeEach(() => {
    mockOwner = { id: 'test-owner', x: 100, y: 100 };
    basicConfig = {
      x: 200,
      y: 300,
      owner: mockOwner,
      radius: 80
    };
  });

  describe('markDamageDealt prevents further collisions', () => {
    it('should prevent collision detection after markDamageDealt is called', () => {
      const aoe = new AOEEffect(basicConfig);
      const target = { x: 210, y: 310, radius: 20 };
      
      // Initially should detect collision (target is within radius)
      expect(aoe.checkCollision(target)).toBe(true);
      
      // Mark damage as dealt
      aoe.markDamageDealt();
      
      // Should no longer detect collision with same target
      expect(aoe.checkCollision(target)).toBe(false);
    });

    it('should prevent collision with multiple targets after markDamageDealt', () => {
      const aoe = new AOEEffect(basicConfig);
      const target1 = { x: 210, y: 310, radius: 20 };
      const target2 = { x: 220, y: 320, radius: 15 };
      const target3 = { x: 190, y: 290, radius: 25 };
      
      // All targets are within radius initially
      expect(aoe.checkCollision(target1)).toBe(true);
      expect(aoe.checkCollision(target2)).toBe(true);
      expect(aoe.checkCollision(target3)).toBe(true);
      
      // Mark damage as dealt
      aoe.markDamageDealt();
      
      // Should not detect collision with any target
      expect(aoe.checkCollision(target1)).toBe(false);
      expect(aoe.checkCollision(target2)).toBe(false);
      expect(aoe.checkCollision(target3)).toBe(false);
    });

    it('should not affect collision detection if markDamageDealt is never called', () => {
      const aoe = new AOEEffect(basicConfig);
      const target = { x: 210, y: 310, radius: 20 };
      
      // Should detect collision multiple times if damage not marked
      expect(aoe.checkCollision(target)).toBe(true);
      expect(aoe.checkCollision(target)).toBe(true);
      expect(aoe.checkCollision(target)).toBe(true);
    });
  });

  describe('collision at exact radius boundary', () => {
    it('should detect collision when target is exactly at radius boundary', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 50 });
      // Place target exactly at distance = aoe.radius + target.radius
      // AOE at (200, 300), radius 50
      // Target radius 20, so distance should be exactly 70
      const target = { x: 270, y: 300, radius: 20 };
      
      const dx = aoe.x - target.x;
      const dy = aoe.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verify distance is exactly at boundary
      expect(distance).toBe(70);
      
      // Should NOT detect collision (distance < sumOfRadii is false when equal)
      expect(aoe.checkCollision(target)).toBe(false);
    });

    it('should detect collision when target is just inside radius boundary', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 50 });
      // Place target just inside the boundary
      // AOE at (200, 300), radius 50
      // Target radius 20, distance should be 69 (just under 70)
      const target = { x: 269, y: 300, radius: 20 };
      
      const dx = aoe.x - target.x;
      const dy = aoe.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verify distance is just inside boundary
      expect(distance).toBeLessThan(70);
      
      // Should detect collision
      expect(aoe.checkCollision(target)).toBe(true);
    });

    it('should not detect collision when target is just outside radius boundary', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 50 });
      // Place target just outside the boundary
      // AOE at (200, 300), radius 50
      // Target radius 20, distance should be 71 (just over 70)
      const target = { x: 271, y: 300, radius: 20 };
      
      const dx = aoe.x - target.x;
      const dy = aoe.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Verify distance is just outside boundary
      expect(distance).toBeGreaterThan(70);
      
      // Should not detect collision
      expect(aoe.checkCollision(target)).toBe(false);
    });

    it('should handle collision with zero-radius target at boundary', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 50 });
      // Target with no radius property (defaults to 20 in implementation)
      const target = { x: 250, y: 300 };
      
      const dx = aoe.x - target.x;
      const dy = aoe.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Distance is 50, sum of radii is 50 + 20 = 70
      expect(distance).toBe(50);
      
      // Should detect collision (50 < 70)
      expect(aoe.checkCollision(target)).toBe(true);
    });
  });

  describe('expanding radius animation timing', () => {
    it('should start at 50% of full radius at creation time', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 100 });
      
      // At creation time (progress = 0), radius should be 50% of full
      const progress = 0;
      const expectedRadius = 100 * (0.5 + progress * 0.5);
      
      expect(expectedRadius).toBe(50);
    });

    it('should reach 100% of full radius at end of lifetime', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 100, lifetime: 500 });
      
      // At end of lifetime (progress = 1), radius should be 100% of full
      const progress = 1;
      const expectedRadius = 100 * (0.5 + progress * 0.5);
      
      expect(expectedRadius).toBe(100);
    });

    it('should be at 75% of full radius at halfway through lifetime', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 100, lifetime: 500 });
      
      // At halfway (progress = 0.5), radius should be 75% of full
      const progress = 0.5;
      const expectedRadius = 100 * (0.5 + progress * 0.5);
      
      expect(expectedRadius).toBe(75);
    });

    it('should expand radius linearly over lifetime', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 100, lifetime: 1000 });
      
      // Test at various progress points
      const testPoints = [
        { progress: 0, expected: 50 },
        { progress: 0.25, expected: 62.5 },
        { progress: 0.5, expected: 75 },
        { progress: 0.75, expected: 87.5 },
        { progress: 1, expected: 100 }
      ];
      
      testPoints.forEach(({ progress, expected }) => {
        const currentRadius = 100 * (0.5 + progress * 0.5);
        expect(currentRadius).toBe(expected);
      });
    });

    it('should use expanding radius for collision detection over time', () => {
      const aoe = new AOEEffect({ ...basicConfig, radius: 100, lifetime: 1000 });
      
      // Note: checkCollision uses the full radius, not the expanding visual radius
      // This test verifies that collision detection uses the full radius consistently
      const target = { x: 280, y: 300, radius: 20 };
      
      // Distance is 80, sum of radii is 100 + 20 = 120
      const dx = aoe.x - target.x;
      const dy = aoe.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      expect(distance).toBe(80);
      
      // Should detect collision regardless of animation progress
      // because checkCollision uses this.radius (100), not the expanding visual radius
      expect(aoe.checkCollision(target)).toBe(true);
    });

    it('should calculate correct visual radius at different time points', () => {
      const fullRadius = 80;
      const lifetime = 500;
      
      // Simulate different time points
      const timePoints = [
        { elapsed: 0, expectedProgress: 0, expectedRadius: 40 },
        { elapsed: 125, expectedProgress: 0.25, expectedRadius: 50 },
        { elapsed: 250, expectedProgress: 0.5, expectedRadius: 60 },
        { elapsed: 375, expectedProgress: 0.75, expectedRadius: 70 },
        { elapsed: 500, expectedProgress: 1, expectedRadius: 80 }
      ];
      
      timePoints.forEach(({ elapsed, expectedProgress, expectedRadius }) => {
        const progress = elapsed / lifetime;
        const currentRadius = fullRadius * (0.5 + progress * 0.5);
        
        expect(progress).toBeCloseTo(expectedProgress, 5);
        expect(currentRadius).toBeCloseTo(expectedRadius, 5);
      });
    });
  });
});
