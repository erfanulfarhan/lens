/**
 * What the demo window plays.
 *
 * Three scenes, one per thing Lens actually does: read the screen, follow what
 * was just said, answer from your own documents. The answers are short on
 * purpose. A landing page demo that streams four paragraphs is read by nobody
 * and makes the box change height, so each scene lands three lines and stops.
 *
 * These are recreations of real exchanges, not screen recordings, which is why
 * the section says so next to it.
 */
export interface Scene {
  /** Shown in the composer as it is typed. */
  question: string;
  /** The badge the app would show for this kind of question. */
  badge: string;
  /** Whether the badge reports a screen capture went with the question. */
  sawScreen?: boolean;
  /** One line per bullet in the answer. */
  answer: { lead: string; rest: string }[];
  /** The capability this scene demonstrates, for the dots' labels. */
  label: string;
}

export const SCENES: Scene[] = [
  {
    label: 'Reads your screen',
    question: 'What is this error actually telling me?',
    badge: 'LOCAL · SCREEN',
    sawScreen: true,
    answer: [
      { lead: 'The port is taken.', rest: 'Something else is already listening on 5173.' },
      { lead: 'Find it:', rest: 'lsof -i :5173 gives you the process id.' },
      { lead: 'Then either', rest: 'stop that process, or start this one on 5174.' },
    ],
  },
  {
    label: 'Follows your calls',
    question: 'They just asked how I handle a slipping deadline.',
    badge: 'LOCAL · LISTENING',
    answer: [
      { lead: 'Say it early.', rest: 'Flag the slip while there is still room to act.' },
      { lead: 'Bring options.', rest: 'Cut scope, move the date, or add people.' },
      { lead: 'Name the cost', rest: 'of each one, then let them choose.' },
    ],
  },
  {
    label: 'Answers from your files',
    question: 'What does my contract say about notice?',
    badge: 'LOCAL · 3 DOCS',
    answer: [
      { lead: 'Thirty days,', rest: 'in writing, either side. Clause 8.2.' },
      { lead: 'Garden leave', rest: 'is at their discretion, not yours.' },
      { lead: 'Untaken holiday', rest: 'is paid out on the final day.' },
    ],
  },
];

/** The app's own vocabulary, so the demo does not invent a different voice. */
export const THINKING_WORDS = [
  'Spinning', 'Smooshing', 'Noodling', 'Percolating', 'Marinating',
  'Simmering', 'Whirring', 'Cogitating', 'Ruminating', 'Pondering',
  'Untangling', 'Churning', 'Sifting', 'Grokking', 'Musing',
];
