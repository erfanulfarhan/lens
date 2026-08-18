import { describe, expect, it } from 'vitest'
import { questionNeedsScreen } from './screen-relevance.js'

describe('questionNeedsScreen — ordinary questions must NOT grab the screen', () => {
  // These all falsely triggered the screen in an earlier version, which made a
  // vision model describe the desktop instead of answering the question.
  const verbal = [
    'what should I say about that weakness',
    'how do I answer this question about teamwork',
    'I want to see if my answer is good',
    'tell me about my strengths',
    'why do I want to study data science',
    'can you help me with my introduction',
    'what are the codes of conduct I should mention',
    'give me a better answer for this',
    'how should I introduce myself here',
  ]
  for (const q of verbal) {
    it(`text only: "${q}"`, () => expect(questionNeedsScreen(q)).toBe(false))
  }
})

describe('questionNeedsScreen — real screen questions DO grab the screen', () => {
  const screen = [
    'what does this error mean',
    "read what's on my screen",
    'explain this code',
    'translate this',
    'what am I looking at',
    'summarize this page',
    'check the terminal output',
    'describe this diagram',
    'fix this',
  ]
  for (const q of screen) {
    it(`needs screen: "${q}"`, () => expect(questionNeedsScreen(q)).toBe(true))
  }
})
