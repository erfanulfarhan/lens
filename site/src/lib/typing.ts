export type Phase = 'typing' | 'holding' | 'erasing';

export interface TypeState {
  text: string;
  phase: Phase;
  hold: number;
}

export const startTyping = (): TypeState => ({ text: '', phase: 'typing', hold: 0 });

/**
 * One step of a typewriter.
 *
 * A state machine rather than nested timeouts, so the cycle is inspectable and a
 * target that changes mid-word cannot splice two questions together: the text is
 * always re-sliced from the current target.
 */
export function step(state: TypeState, target: string, holdTicks: number): TypeState {
  switch (state.phase) {
    case 'typing':
      return state.text === target
        ? { ...state, phase: 'holding', hold: holdTicks }
        : { ...state, text: target.slice(0, state.text.length + 1) };
    case 'holding':
      return state.hold > 0 ? { ...state, hold: state.hold - 1 } : { ...state, phase: 'erasing' };
    case 'erasing':
      return state.text.length === 0
        ? { text: '', phase: 'typing', hold: 0 }
        : { ...state, text: state.text.slice(0, -1) };
  }
}

export const finishedCycle = (s: TypeState) => s.phase === 'typing' && s.text === '';
