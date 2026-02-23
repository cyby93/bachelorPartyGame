import { describe, it, expect, beforeEach } from '@jest/globals';
import HealEffect from './HealEffect.js';
import Ability from './Ability.js';

describe('HealEffect', () => {
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
      const heal = new HealEffect(basicConfig);
      expect(heal instanceof Ability).toBe(true);
      expect(heal instanceof HealEffect).toBe(true);
    });

    it('should inherit destroy method from Ability', () => {
      const heal = new HealEffect(basicConfig);
      expect(heal.isAlive).toBe(true);
      heal.destroy();
      expect(heal.isAlive).toBe(false);
    });
  });

  describe('Constructor', () => {
    it('should initialize base properties via super()', () => {
      const heal = new HealEffect(basicConfig);
      expect(heal.x).toBe(200);
      expect(heal.y).toBe(300);
      expect(heal.owner).toBe(mockOwner);
      expect(heal.isAlive).toBe(true);
      expect(typeof heal.createdAt).toBe('number');
    });

    it('should use default values for optional base properties', () => {
      const heal = new HealEffect(basicConfig);
      expect(heal.lifetime).toBe(500); // HealEffect-specific default
      expect(heal.radius).toBe(15); // HealEffect-specific default
      expect(heal.color).toBe('#2ecc71'); // HealEffect-specific default
    });

    it('should allow overriding default base properties', () => {
      const config = {
        ...basicConfig,
        lifetime: 1000,
        radius: 25,
        color: '#00ff00'
      };
      const heal = new HealEffect(config);
      expect(heal.lifetime).toBe(1000);
      expect(heal.radius).toBe(25);
      expect(heal.color).toBe('#00ff00');
    });

    it('should initialize HealEffect-specific properties', () => {
      const heal = new HealEffect(basicConfig);
      expect(heal.amount).toBe(30); // default
    });

    it('should allow overriding amount property', () => {
      const config = { ...basicConfig, amount: 50 };
      const heal = new HealEffect(config);
      expect(heal.amount).toBe(50);
    });
  });

  describe('Methods', () => {
    it('should have update method', () => {
      const heal = new HealEffect(basicConfig);
      expect(typeof heal.update).toBe('function');
      heal.update(16); // Should not throw
    });

    it('should have render method', () => {
      const heal = new HealEffect(basicConfig);
      const mockCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {}
      };
      expect(typeof heal.render).toBe('function');
      heal.render(mockCtx); // Should not throw
    });
  });

  describe('Backward Compatibility', () => {
    it('should work with existing HealEffect creation patterns', () => {
      const config = {
        x: 400,
        y: 500,
        owner: mockOwner,
        amount: 40,
        radius: 20,
        lifetime: 600,
        color: '#00ff00'
      };
      const heal = new HealEffect(config);
      
      expect(heal.x).toBe(400);
      expect(heal.y).toBe(500);
      expect(heal.owner).toBe(mockOwner);
      expect(heal.amount).toBe(40);
      expect(heal.radius).toBe(20);
      expect(heal.lifetime).toBe(600);
      expect(heal.color).toBe('#00ff00');
      expect(heal.isAlive).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should move upward at exactly 0.5 pixels per frame', () => {
      const heal = new HealEffect(basicConfig);
      const initialY = heal.y;
      
      heal.update(16);
      expect(heal.y).toBe(initialY - 0.5);
      
      heal.update(16);
      expect(heal.y).toBe(initialY - 1.0);
      
      heal.update(16);
      expect(heal.y).toBe(initialY - 1.5);
    });

    it('should expire exactly when lifetime is reached', () => {
      const config = { ...basicConfig, lifetime: 1000 };
      const heal = new HealEffect(config);
      
      expect(heal.isAlive).toBe(true);
      
      // Mock time to be just before expiration
      const originalNow = Date.now;
      Date.now = jest.fn(() => heal.createdAt + 999);
      heal.update(16);
      expect(heal.isAlive).toBe(true);
      
      // Mock time to be exactly at expiration
      Date.now = jest.fn(() => heal.createdAt + 1000);
      heal.update(16);
      expect(heal.isAlive).toBe(true);
      
      // Mock time to be just after expiration
      Date.now = jest.fn(() => heal.createdAt + 1001);
      heal.update(16);
      expect(heal.isAlive).toBe(false);
      
      Date.now = originalNow;
    });

    it('should initialize amount property with default value', () => {
      const heal = new HealEffect(basicConfig);
      expect(heal.amount).toBe(30);
    });

    it('should initialize amount property with custom value', () => {
      const config = { ...basicConfig, amount: 75 };
      const heal = new HealEffect(config);
      expect(heal.amount).toBe(75);
    });

    it('should initialize amount property with zero value', () => {
      const config = { ...basicConfig, amount: 0 };
      const heal = new HealEffect(config);
      expect(heal.amount).toBe(0);
    });
  });
});

/**
 * Property-based tests for the HealEffect class
 * Uses fast-check for property-based testing
 */

import fc from 'fast-check';
import { jest } from '@jest/globals';

describe('HealEffect Class - Property Tests', () => {
  
  // Feature: base-ability-class, Property 15: HealEffect constructor initialization
  // **Validates: Requirements 5.3**
  it('Property 15: HealEffect constructor initialization - all properties correctly initialized', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          amount: fc.integer({ min: 1, max: 100 }),
          lifetime: fc.integer({ min: 100, max: 2000 }),
          radius: fc.integer({ min: 5, max: 50 }),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
        }),
        (config) => {
          const heal = new HealEffect(config);
          
          // Verify base properties from Ability
          expect(heal.x).toBe(config.x);
          expect(heal.y).toBe(config.y);
          expect(heal.owner).toBe(config.owner);
          expect(heal.lifetime).toBe(config.lifetime);
          expect(heal.radius).toBe(config.radius);
          expect(heal.color).toBe(config.color);
          expect(heal.isAlive).toBe(true);
          expect(typeof heal.createdAt).toBe('number');
          
          // Verify HealEffect-specific properties
          expect(heal.amount).toBe(config.amount);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 16: HealEffect upward movement
  // **Validates: Requirements 5.4**
  it('Property 16: HealEffect upward movement - y position decreases after update', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 100, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          amount: fc.integer({ min: 1, max: 100 })
        }),
        (config) => {
          const heal = new HealEffect(config);
          const initialY = heal.y;
          
          // Call update
          heal.update(16);
          
          // Verify y position decreased (moved upward)
          expect(heal.y).toBeLessThan(initialY);
          expect(heal.y).toBe(initialY - 0.5);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 17: Lifetime expiration
  // **Validates: Requirements 5.4**
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
          const heal = new HealEffect(config);
          
          expect(heal.isAlive).toBe(true);
          
          // Simulate time passing beyond lifetime
          const originalNow = Date.now;
          Date.now = jest.fn(() => heal.createdAt + config.lifetime + 10);
          
          heal.update(16);
          
          // Verify heal effect is no longer alive
          expect(heal.isAlive).toBe(false);
          
          // Restore Date.now
          Date.now = originalNow;
        }
      ),
      { numRuns: 100 }
    );
  });
});
