/** Presentation only: projectile speed, collision and weapon damage stay in the simulation. */
export const WEAPON_EFFECTS = {
  marine: {
    color: 0xffdc8c, smoke: 0x8d9a91, trailSpacing: 8, trailLife: .075,
    trailLength: 17, trailWidth: 1.6, curve: 0, recoil: 2, kickTime: .018, recoverTime: .12,
    flashLife: .045, flashAlpha: .6, flinch: 1.5, reactionLife: .1,
  },
  arrow: {
    color: 0xffac52, smoke: 0xa7a99c, trailSpacing: 7, trailLife: .32,
    trailLength: 10, trailWidth: 4, curve: 11, recoil: 1.5, kickTime: .025, recoverTime: .18,
    flashLife: .06, flashAlpha: .65, flinch: 2.5, reactionLife: .13,
  },
  cannon: {
    color: 0xffbd77, smoke: 0x968575, trailSpacing: 9, trailLife: .1,
    trailLength: 23, trailWidth: 3, curve: 0, recoil: 8, kickTime: .035, recoverTime: .32,
    flashLife: .075, flashAlpha: .8, flinch: 4, reactionLife: .17,
  },
} as const;

export type WeaponEffectKey = keyof typeof WEAPON_EFFECTS;
export const hasWeaponEffects = (key: string): key is WeaponEffectKey => Object.prototype.hasOwnProperty.call(WEAPON_EFFECTS, key);
