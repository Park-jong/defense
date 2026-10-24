// Compatibility exports while scene, UI and asset modules migrate to their own layers.
// Battlefield state belongs to each GameScene's MapRuntime, never to this module.
export * from './data/rules';
export * from './data/units';
export * from './data/enemies';
export * from './data/maps';
export * from './interface/layout';
