import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown } from './markdown.js'

describe('parseInline', () => {
  it('reads bold, italic and code', () => {
    expect(parseInline('a **b** c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'bold', value: 'b' },
      { type: 'text', value: ' c' },
    ])
    expect(parseInline('*em*')).toEqual([{ type: 'italic', value: 'em' }])
    expect(parseInline('`x = 1`')).toEqual([{ type: 'code', value: 'x = 1' }])
  })

  it('leaves markdown inside code spans alone', () => {
    expect(parseInline('`**not bold**`')).toEqual([{ type: 'code', value: '**not bold**' }])
  })

  it('returns plain text unchanged', () => {
    expect(parseInline('nothing special')).toEqual([{ type: 'text', value: 'nothing special' }])
  })
})

describe('parseMarkdown', () => {
  // This is exactly what a model returned and the app printed with raw asterisks.
  it('handles the bulleted answer shape models actually produce', () => {
    const blocks = parseMarkdown(
      'Before publishing, check for:\n\n* **License:** Choose one.\n* **README:** Write it.\n'
    )
    expect(blocks[0].type).toBe('paragraph')
    expect(blocks[1]).toMatchObject({ type: 'bullet' })
    const bullet = blocks[1] as { items: unknown[][] }
    expect(bullet.items).toHaveLength(2)
    expect(bullet.items[0][0]).toEqual({ type: 'bold', value: 'License:' })
  })

  it('groups consecutive bullets into one list', () => {
    const blocks = parseMarkdown('- one\n- two\n- three')
    expect(blocks).toHaveLength(1)
    expect((blocks[0] as { items: unknown[] }).items).toHaveLength(3)
  })

  it('reads numbered lists, with either . or )', () => {
    expect(parseMarkdown('1. first\n2) second')).toMatchObject([{ type: 'numbered' }])
  })

  it('reads headings by level', () => {
    expect(parseMarkdown('### Title')).toMatchObject([{ type: 'heading', level: 3 }])
  })

  it('keeps fenced code verbatim', () => {
    const blocks = parseMarkdown('```py\nx = 1\n# *not* italic\n```')
    expect(blocks[0]).toEqual({ type: 'codeblock', value: 'x = 1\n# *not* italic', lang: 'py' })
  })

  it('joins wrapped lines into one paragraph and splits on blank lines', () => {
    const blocks = parseMarkdown('line one\nline two\n\nsecond para')
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ type: 'paragraph' })
  })

  it('survives empty input', () => {
    expect(parseMarkdown('')).toEqual([])
  })
})
