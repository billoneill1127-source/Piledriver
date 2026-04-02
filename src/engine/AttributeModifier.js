// AttributeModifier.js
// Applies temporary and permanent stat changes to wrestlers during a match
// (e.g. stamina drain, stun effect, momentum bonuses).

export class AttributeModifier {
  constructor() {
    this.activeEffects = [];
    // TODO: implement effect stacking, duration tracking, removal
  }

  apply(wrestler, effect) {
    // TODO: push effect, recalculate effective attributes
  }

  tick(wrestler) {
    // TODO: decrement durations, remove expired effects
  }
}
