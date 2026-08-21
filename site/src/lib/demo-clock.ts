import type { Scene } from './demo-script';

/** Per-character typing speed, and per-word streaming speed, in ms. */
const TYPE_MS = 26;
const SEND_MS = 260;
const THINK_MS = 900;
const WORD_MS = 46;
const HOLD_MS = 2500;

export interface Frame {
  /** How much of the question has been typed. */
  typed: string;
  /** The question has left the composer and is now a bubble. */
  sent: boolean;
  /** The model is working; no answer text yet. */
  thinking: boolean;
  /** Seconds shown next to the thinking word. */
  thinkingSeconds: number;
  /** How many words of the answer have arrived, across all bullets. */
  words: number;
  /** The answer is complete and the badge is showing. */
  done: boolean;
}

function answerWords(scene: Scene): number {
  return scene.answer.reduce(
    (n, b) => n + `${b.lead} ${b.rest}`.trim().split(/\s+/).length,
    0,
  );
}

/** Total length of one scene, so the caller knows when to advance. */
export function sceneDuration(scene: Scene): number {
  return (
    scene.question.length * TYPE_MS +
    SEND_MS +
    THINK_MS +
    answerWords(scene) * WORD_MS +
    HOLD_MS
  );
}

/**
 * The whole demo is a pure function of elapsed time.
 *
 * Deliberately not a chain of setTimeouts. A timer chain for a sequence this
 * long has to be torn down correctly on every scene change, pause, unmount and
 * re-render, and the failure mode is two overlapping playbacks. Deriving the
 * frame from one number means pausing is not advancing the number, and there is
 * no state to get out of step.
 */
export function frameAt(scene: Scene, elapsed: number): Frame {
  const typeEnd = scene.question.length * TYPE_MS;
  const sendEnd = typeEnd + SEND_MS;
  const thinkEnd = sendEnd + THINK_MS;
  const total = answerWords(scene);
  const streamEnd = thinkEnd + total * WORD_MS;

  if (elapsed < typeEnd) {
    return {
      typed: scene.question.slice(0, Math.floor(elapsed / TYPE_MS)),
      sent: false,
      thinking: false,
      thinkingSeconds: 0,
      words: 0,
      done: false,
    };
  }
  if (elapsed < sendEnd) {
    return { typed: scene.question, sent: false, thinking: false, thinkingSeconds: 0, words: 0, done: false };
  }
  if (elapsed < thinkEnd) {
    return {
      typed: '',
      sent: true,
      thinking: true,
      thinkingSeconds: (elapsed - sendEnd) / 1000,
      words: 0,
      done: false,
    };
  }
  if (elapsed < streamEnd) {
    return {
      typed: '',
      sent: true,
      thinking: false,
      thinkingSeconds: THINK_MS / 1000,
      words: Math.floor((elapsed - thinkEnd) / WORD_MS),
      done: false,
    };
  }
  return {
    typed: '',
    sent: true,
    thinking: false,
    thinkingSeconds: THINK_MS / 1000,
    words: total,
    done: true,
  };
}

/** The finished state, for anyone who has asked for reduced motion. */
export function finalFrame(scene: Scene): Frame {
  return frameAt(scene, sceneDuration(scene));
}
