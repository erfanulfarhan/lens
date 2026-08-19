export type TypePhase = 'typing' | 'holding' | 'erasing'

export interface TypeState {
  /** What is currently visible. */
  text: string
  phase: TypePhase
  /** Ticks left to hold a finished word before erasing it. */
  hold: number
}

export const initialTypeState = (): TypeState => ({ text: '', phase: 'typing', hold: 0 })

/**
 * Advances the typewriter by one step.
 *
 * A state machine rather than a chain of timeouts, so the whole cycle is
 * inspectable and testable: typing out a word, holding it, erasing it, then
 * typing the next. Erasing rather than cutting to the next word is what makes it
 * read as one continuous line of thought.
 */
export function advanceTyping(state: TypeState, target: string, holdTicks = 12): TypeState {
  switch (state.phase) {
    case 'typing': {
      if (state.text === target) return { ...state, phase: 'holding', hold: holdTicks }
      // Re-slice from the target rather than appending, so a target that changes
      // mid-word cannot leave characters from the previous one behind.
      return { ...state, text: target.slice(0, state.text.length + 1) }
    }

    case 'holding':
      return state.hold > 0
        ? { ...state, hold: state.hold - 1 }
        : { ...state, phase: 'erasing' }

    case 'erasing': {
      if (state.text.length === 0) return { text: '', phase: 'typing', hold: 0 }
      return { ...state, text: state.text.slice(0, -1) }
    }
  }
}

/** True when the word has been fully erased and a new one should be chosen. */
export function readyForNextWord(state: TypeState): boolean {
  return state.phase === 'typing' && state.text === ''
}
