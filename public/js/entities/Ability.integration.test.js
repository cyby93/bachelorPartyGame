/**
 * Integration tests for the Ability inheritance hierarchy
 * Verifies that all ability classes properly extend the base Ability class
 */

import { describe, test, expect, jest } from '@jest/globals';
import Ability from './Ability.js';
import Projectile from './Projectile.js';
import MeleeAttack from './MeleeAttack.js';
import AOEEffect from './AOEEffect.js';
import HealEffect from './HealEffect.js';

describe('Ability Inheritance Hierarchy - Integration Tests', () => {
  
  // Task 10.1: Test that all ability classes are instances of Ability
  // **Validates: Requirements 6.1, 6.5**
  test('All ability classes are instances of Ability', () => {
    const owner = { id: 'test-owner' };
    
    // Create instances of each ability type
    const projectile = new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 });
    const meleeAttack = new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } });
    const aoeEffect = new AOEEffect({ x: 300, y: 300, owner });
    const healEffect = new HealEffect({ x: 400, y: 400, owner });
    
    // Verify each is an instance of Ability
    expect(projectile instanceof Ability).toBe(true);
    expect(meleeAttack instanceof Ability).toBe(true);
    expect(aoeEffect instanceof Ability).toBe(true);
    expect(healEffect instanceof Ability).toBe(true);
    
    // Verify each is also an instance of its specific class
    expect(projectile instanceof Projectile).toBe(true);
    expect(meleeAttack instanceof MeleeAttack).toBe(true);
    expect(aoeEffect instanceof AOEEffect).toBe(true);
    expect(healEffect instanceof HealEffect).toBe(true);
  });
  
  // Task 10.1: Test that all abilities can be stored in a single array
  // **Validates: Requirements 6.1**
  test('All abilities can be stored in a single array', () => {
    const owner = { id: 'test-owner' };
    
    // Create instances of each ability type
    const projectile = new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 });
    const meleeAttack = new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } });
    const aoeEffect = new AOEEffect({ x: 300, y: 300, owner });
    const healEffect = new HealEffect({ x: 400, y: 400, owner });
    
    // Store all abilities in a single array
    const abilities = [projectile, meleeAttack, aoeEffect, healEffect];
    
    // Verify array contains all abilities
    expect(abilities.length).toBe(4);
    
    // Verify all elements are instances of Ability
    abilities.forEach(ability => {
      expect(ability instanceof Ability).toBe(true);
      expect(ability.isAlive).toBe(true);
      expect(typeof ability.x).toBe('number');
      expect(typeof ability.y).toBe('number');
      expect(ability.owner).toBe(owner);
    });
    
    // Verify we can access base class properties on all abilities
    const positions = abilities.map(a => ({ x: a.x, y: a.y }));
    expect(positions).toEqual([
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 300, y: 300 },
      { x: 400, y: 400 }
    ]);
  });
  
  // Task 10.1: Test that destroy() works on all ability types
  // **Validates: Requirements 6.5**
  test('destroy() works on all ability types', () => {
    const owner = { id: 'test-owner' };
    
    // Create instances of each ability type
    const projectile = new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 });
    const meleeAttack = new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } });
    const aoeEffect = new AOEEffect({ x: 300, y: 300, owner });
    const healEffect = new HealEffect({ x: 400, y: 400, owner });
    
    const abilities = [projectile, meleeAttack, aoeEffect, healEffect];
    
    // Verify all abilities start alive
    abilities.forEach(ability => {
      expect(ability.isAlive).toBe(true);
    });
    
    // Call destroy() on each ability
    abilities.forEach(ability => {
      ability.destroy();
    });
    
    // Verify all abilities are now dead
    abilities.forEach(ability => {
      expect(ability.isAlive).toBe(false);
    });
  });
  
  // Additional test: Polymorphic behavior with mixed array
  test('Polymorphic behavior - all abilities respond to common interface', () => {
    const owner = { id: 'test-owner' };
    
    // Create instances of each ability type
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } }),
      new AOEEffect({ x: 300, y: 300, owner }),
      new HealEffect({ x: 400, y: 400, owner })
    ];
    
    // Verify all abilities have the required methods
    abilities.forEach(ability => {
      expect(typeof ability.update).toBe('function');
      expect(typeof ability.render).toBe('function');
      expect(typeof ability.checkCollision).toBe('function');
      expect(typeof ability.destroy).toBe('function');
    });
    
    // Verify we can call update on all abilities without errors
    abilities.forEach(ability => {
      expect(() => ability.update(16)).not.toThrow();
    });
    
    // Verify we can call checkCollision on all abilities
    const target = { x: 100, y: 100, radius: 20 };
    abilities.forEach(ability => {
      const result = ability.checkCollision(target);
      expect(typeof result).toBe('boolean');
    });
  });
  
  // Additional test: Verify base class properties are accessible
  test('Base class properties are accessible on all ability types', () => {
    const owner = { id: 'test-owner' };
    
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0, color: '#ff0000' }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 }, radius: 30 }),
      new AOEEffect({ x: 300, y: 300, owner, lifetime: 1000 }),
      new HealEffect({ x: 400, y: 400, owner })
    ];
    
    // Verify all abilities have base class properties
    abilities.forEach(ability => {
      expect(typeof ability.x).toBe('number');
      expect(typeof ability.y).toBe('number');
      expect(ability.owner).toBeDefined();
      expect(typeof ability.lifetime).toBe('number');
      expect(typeof ability.createdAt).toBe('number');
      expect(typeof ability.isAlive).toBe('boolean');
      expect(typeof ability.radius).toBe('number');
      expect(typeof ability.color).toBe('string');
    });
    
    // Verify specific values
    expect(abilities[0].color).toBe('#ff0000');
    expect(abilities[1].radius).toBe(30);
    expect(abilities[2].lifetime).toBe(1000);
  });

  // Task 10.2: Test mixed array of different ability types
  // **Validates: Requirements 6.1, 6.2, 6.4**
  test('Mixed array of different ability types maintains type-specific behavior', () => {
    const owner = { id: 'test-owner' };
    
    // Create a mixed array with multiple instances of each type
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0, damage: 10 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 }, damage: 15 }),
      new AOEEffect({ x: 300, y: 300, owner, damage: 20 }),
      new HealEffect({ x: 400, y: 400, owner, amount: 30 }),
      new Projectile({ x: 150, y: 150, owner, vx: -3, vy: 4, pierce: true }),
      new MeleeAttack({ x: 250, y: 250, owner, direction: { x: 0, y: 1 }, range: 100 }),
      new AOEEffect({ x: 350, y: 350, owner, radius: 50 }),
      new HealEffect({ x: 450, y: 450, owner, amount: 50 })
    ];
    
    // Verify array contains correct number of abilities
    expect(abilities.length).toBe(8);
    
    // Verify all are instances of Ability
    abilities.forEach(ability => {
      expect(ability instanceof Ability).toBe(true);
    });
    
    // Verify type-specific properties are preserved
    expect(abilities[0].damage).toBe(10);
    expect(abilities[0].pierce).toBe(false);
    expect(abilities[1].damage).toBe(15);
    expect(abilities[2].damage).toBe(20);
    expect(abilities[3].amount).toBe(30);
    expect(abilities[4].pierce).toBe(true);
    expect(abilities[5].range).toBe(100);
    expect(abilities[6].radius).toBe(50);
    expect(abilities[7].amount).toBe(50);
    
    // Verify we can filter by type
    const projectiles = abilities.filter(a => a instanceof Projectile);
    const meleeAttacks = abilities.filter(a => a instanceof MeleeAttack);
    const aoeEffects = abilities.filter(a => a instanceof AOEEffect);
    const healEffects = abilities.filter(a => a instanceof HealEffect);
    
    expect(projectiles.length).toBe(2);
    expect(meleeAttacks.length).toBe(2);
    expect(aoeEffects.length).toBe(2);
    expect(healEffects.length).toBe(2);
  });

  // Task 10.2: Test polymorphic behavior - calling update on base type
  // **Validates: Requirements 6.1, 6.2**
  test('Polymorphic update() calls work correctly on mixed array', () => {
    const owner = { id: 'test-owner' };
    
    // Create mixed array with different ability types
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } }),
      new AOEEffect({ x: 300, y: 300, owner }),
      new HealEffect({ x: 400, y: 400, owner })
    ];
    
    // Store initial positions
    const initialPositions = abilities.map(a => ({ x: a.x, y: a.y }));
    
    // Call update on all abilities polymorphically
    abilities.forEach(ability => {
      ability.update(16); // 16ms delta time (60 FPS)
    });
    
    // Verify Projectile moved (has velocity)
    expect(abilities[0].x).not.toBe(initialPositions[0].x);
    expect(abilities[0].distanceTraveled).toBeGreaterThan(0);
    
    // Verify MeleeAttack stayed in place (no movement)
    expect(abilities[1].x).toBe(initialPositions[1].x);
    expect(abilities[1].y).toBe(initialPositions[1].y);
    
    // Verify AOEEffect stayed in place (no movement)
    expect(abilities[2].x).toBe(initialPositions[2].x);
    expect(abilities[2].y).toBe(initialPositions[2].y);
    
    // Verify HealEffect moved upward (y decreased)
    expect(abilities[3].y).toBeLessThan(initialPositions[3].y);
    
    // Verify all abilities are still alive after one update
    abilities.forEach(ability => {
      expect(ability.isAlive).toBe(true);
    });
  });

  // Task 10.2: Test polymorphic behavior - calling render on base type
  // **Validates: Requirements 6.1, 6.3**
  test('Polymorphic render() calls work correctly on mixed array', () => {
    const owner = { id: 'test-owner' };
    
    // Create mixed array with different ability types
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } }),
      new AOEEffect({ x: 300, y: 300, owner }),
      new HealEffect({ x: 400, y: 400, owner })
    ];
    
    // Create a mock canvas context
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1
    };
    
    // Call render on all abilities polymorphically
    abilities.forEach(ability => {
      expect(() => ability.render(mockCtx)).not.toThrow();
    });
    
    // Verify render was called (context methods were used)
    expect(mockCtx.save.mock.calls.length).toBeGreaterThan(0);
    expect(mockCtx.restore.mock.calls.length).toBeGreaterThan(0);
    
    // Verify each ability type called appropriate drawing methods
    // (All abilities use arc for circles)
    expect(mockCtx.arc.mock.calls.length).toBeGreaterThan(0);
  });

  // Task 10.2: Test that all abilities respond to common interface
  // **Validates: Requirements 6.1, 6.4**
  test('All abilities respond to common interface methods', () => {
    const owner = { id: 'test-owner' };
    
    // Create mixed array with different ability types
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 } }),
      new AOEEffect({ x: 300, y: 300, owner }),
      new HealEffect({ x: 400, y: 400, owner })
    ];
    
    // Verify all abilities have the common interface methods
    abilities.forEach(ability => {
      // Check method existence
      expect(typeof ability.update).toBe('function');
      expect(typeof ability.render).toBe('function');
      expect(typeof ability.checkCollision).toBe('function');
      expect(typeof ability.destroy).toBe('function');
      
      // Verify methods can be called without errors
      expect(() => ability.update(16)).not.toThrow();
      expect(() => ability.destroy()).not.toThrow();
      
      // Verify checkCollision returns boolean
      const target = { x: 100, y: 100, radius: 20 };
      const result = ability.checkCollision(target);
      expect(typeof result).toBe('boolean');
    });
    
    // Verify all abilities have common properties
    abilities.forEach(ability => {
      expect(ability).toHaveProperty('x');
      expect(ability).toHaveProperty('y');
      expect(ability).toHaveProperty('owner');
      expect(ability).toHaveProperty('lifetime');
      expect(ability).toHaveProperty('createdAt');
      expect(ability).toHaveProperty('isAlive');
      expect(ability).toHaveProperty('radius');
      expect(ability).toHaveProperty('color');
    });
  });

  // Task 10.2: Test polymorphic collision detection on mixed array
  // **Validates: Requirements 6.1, 6.4**
  test('Polymorphic checkCollision() works correctly on mixed array', () => {
    const owner = { id: 'test-owner' };
    
    // Create abilities at specific positions
    const abilities = [
      new Projectile({ x: 100, y: 100, owner, vx: 5, vy: 0, radius: 10 }),
      new MeleeAttack({ x: 200, y: 200, owner, direction: { x: 1, y: 0 }, radius: 20 }),
      new AOEEffect({ x: 300, y: 300, owner, radius: 50 }),
      new HealEffect({ x: 400, y: 400, owner, radius: 15 })
    ];
    
    // Create targets at various positions
    const closeTarget = { x: 105, y: 105, radius: 10 }; // Close to projectile
    const farTarget = { x: 500, y: 500, radius: 10 };   // Far from all
    
    // Test collision with close target
    const closeCollisions = abilities.map(a => a.checkCollision(closeTarget));
    
    // Projectile should collide (distance ~7, within radius 10+10=20)
    expect(closeCollisions[0]).toBe(true);
    
    // MeleeAttack should not collide (distance ~134, outside radius 20+10=30)
    expect(closeCollisions[1]).toBe(false);
    
    // AOEEffect should not collide (distance ~276, outside radius 50+10=60)
    expect(closeCollisions[2]).toBe(false);
    
    // HealEffect should not collide (distance ~417, outside radius 15+10=25)
    expect(closeCollisions[3]).toBe(false);
    
    // Test collision with far target
    const farCollisions = abilities.map(a => a.checkCollision(farTarget));
    
    // None should collide with far target
    expect(farCollisions.every(c => c === false)).toBe(true);
    
    // Test that destroyed abilities don't collide
    abilities.forEach(a => a.destroy());
    const deadCollisions = abilities.map(a => a.checkCollision(closeTarget));
    expect(deadCollisions.every(c => c === false)).toBe(true);
  });
});
