const assert = require('assert');

// Simulate the BuilderStateManager
const { createStackManager } = require('../scripts/stack-manager.js');
const manager = createStackManager();

// Test initial state
const initialState = manager.getState();
assert(Array.isArray(initialState.stack), 'Initial stack must be an array');
assert.strictEqual(initialState.stack.length, 0);
assert.strictEqual(initialState.theme, 'midnight-dark');
assert.strictEqual(initialState.viewport, 'desktop');

// Test adding sections
manager.addSection('hero-gradient');
manager.addSection('navbar-glass');
assert.strictEqual(manager.getStack().length, 2);
assert.strictEqual(manager.getStack()[0].slug, 'hero-gradient');
assert.strictEqual(manager.getStack()[1].slug, 'navbar-glass');
assert(manager.getStack()[0].id, 'Each section must have a unique ID');

// Reorder: move navbar to top
const navId = manager.getStack()[1].id;
manager.moveSection(navId, -1);
assert.strictEqual(manager.getStack()[0].slug, 'navbar-glass');
assert.strictEqual(manager.getStack()[1].slug, 'hero-gradient');

// Boundary reorder test: moving top item up shouldn't break anything
manager.moveSection(navId, -1);
assert.strictEqual(manager.getStack()[0].slug, 'navbar-glass');

// Duplicate section
const duplicated = manager.duplicateSection(navId);
assert(duplicated, 'Duplicate should return the duplicated item');
assert.strictEqual(manager.getStack().length, 3);
assert.strictEqual(manager.getStack()[1].slug, 'navbar-glass');
assert.notStrictEqual(duplicated.id, navId, 'Duplicated item must have a new unique ID');

// Remove duplicate
manager.removeSection(duplicated.id);
assert.strictEqual(manager.getStack().length, 2);

// Remove hero
const heroId = manager.getStack()[1].id;
manager.removeSection(heroId);
assert.strictEqual(manager.getStack().length, 1);
assert.strictEqual(manager.getStack()[0].slug, 'navbar-glass');

// Clear stack
manager.clearStack();
assert.strictEqual(manager.getStack().length, 0);

// Test theme, custom colors, viewport updates
manager.setTheme('cyber-glow');
assert.strictEqual(manager.getState().theme, 'cyber-glow');

manager.setCustomColors({ bg: '#112233', text: '#ffffff' });
assert.strictEqual(manager.getState().customColors.bg, '#112233');

manager.setViewport('mobile');
assert.strictEqual(manager.getState().viewport, 'mobile');

// Test subscribers
let subscriberCalled = false;
const unsubscribe = manager.subscribe(state => {
  subscriberCalled = true;
});
manager.addSection('footer-simple');
assert.strictEqual(subscriberCalled, true, 'Subscriber should be called on mutation');
unsubscribe();

console.log('✅ Stack manager state tests passed!');
