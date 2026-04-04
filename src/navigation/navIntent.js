/**
 * navIntent — cross-tab navigation helper
 *
 * React Navigation v7 does not reliably forward nested screen params when
 * switching tabs programmatically (it renders the stack's initial route instead).
 *
 * Pattern:
 *   1. Caller sets an intent:  setNavIntent('StrategyDetail', { strategyId: '...' })
 *   2. Caller switches tab:    navigation.navigate('GoalsTabs')
 *   3. GoalsScreen (initial stack screen) reads the intent on focus and
 *      immediately navigates within the stack to the correct screen.
 */

let _intent = null;

/** Store where to navigate within GoalsStack once the tab is active. */
export function setNavIntent(screen, params) {
  _intent = { screen, params };
}

/** Read and clear the pending intent (call once per focus event). */
export function consumeNavIntent() {
  const intent = _intent;
  _intent = null;
  return intent;
}
