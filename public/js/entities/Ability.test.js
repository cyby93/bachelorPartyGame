/**
 * Property-based tests for the base Ability class
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from '@jest/globals';
import fc from 'fast-check';
import Ability from './Ability.js';

describe('Ability Base Class - Property Tests', () => {
  
  // Feature: base-ability-class, Property 1: Constructor initialization
  // **Validates: Requirements 1.2**
  test('Property 1: Constructor initialization - all provided properties are correctly assigned', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          lifetime: fc.integer({ min: 100, max: 10000 }),
          radius: fc.integer({ min: 5, max: 50 }),
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s)
        }),
        (config) => {
          const ability = new Ability(config);
          
          // Verify all provided properties are correctly assigned
          expect(ability.x).toBe(config.x);
          expect(ability.y).toBe(config.y);
          expect(ability.owner).toBe(config.owner);
          expect(ability.lifetime).toBe(config.lifetime);
          expect(ability.radius).toBe(config.radius);
          expect(ability.color).toBe(config.color);
          
          // Verify createdAt is a valid timestamp
          expect(typeof ability.createdAt).toBe('number');
          expect(ability.createdAt).toBeGreaterThan(0);
          expect(ability.createdAt).toBeLessThanOrEqual(Date.now());
          
          // Verify isAlive is set to true
          expect(ability.isAlive).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 2: Default values
  // **Validates: Requirements 1.3**
  test('Property 2: Default values - missing optional properties use documented defaults', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' })
        }),
        (config) => {
          const ability = new Ability(config);
          
          // Verify default values are applied
          expect(ability.lifetime).toBe(5000);
          expect(ability.radius).toBe(10);
          expect(ability.color).toBe('#ffffff');
          
          // Verify required properties are still set
          expect(ability.x).toBe(config.x);
          expect(ability.y).toBe(config.y);
          expect(ability.owner).toBe(config.owner);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: base-ability-class, Property 3: Destroy method
  // **Validates: Requirements 1.5**
  test('Property 3: Destroy method - calling destroy() sets isAlive to false', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 1000 }),
          y: fc.integer({ min: 0, max: 1000 }),
          owner: fc.constant({ id: 'test-owner' }),
          lifetime: fc.option(fc.integer({ min: 100, max: 10000 })),
          radius: fc.option(fc.integer({ min: 5, max: 50 })),
          color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => '#' + s))
        }),
        (config) => {
          const ability = new Ability(config);
          
          // Verify ability starts alive
          expect(ability.isAlive).toBe(true);
          
          // Call destroy
          ability.destroy();
          
          // Verify isAlive is now false
          expect(ability.isAlive).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test: Abstract methods throw errors
  test('Abstract methods throw errors when called directly', () => {
    const ability = new Ability({ x: 0, y: 0, owner: { id: 'test' } });
    
    // update() is now concrete and handles lifetime checking, so it should not throw
    expect(() => ability.update(16)).not.toThrow();
    
    // render() and checkCollision() are still abstract
    expect(() => ability.render({})).toThrow('render() must be implemented by subclass');
    expect(() => ability.checkCollision({})).toThrow('checkCollision() must be implemented by subclass');
  });
});
