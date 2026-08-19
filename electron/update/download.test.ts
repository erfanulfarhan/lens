import { describe, expect, it } from 'vitest'
import { fileNameFor, percentOf } from './download.js'

describe('fileNameFor', () => {
  it('takes the installer name from a release URL', () => {
    expect(fileNameFor('https://github.com/x/y/releases/download/v1/Lens-1.0.0-arm64.dmg'))
      .toBe('Lens-1.0.0-arm64.dmg')
    expect(fileNameFor('https://d/Lens%20Setup%201.0.0.exe')).toBe('Lens Setup 1.0.0.exe')
  })

  // A crafted link must not be able to write outside the download directory.
  it('strips any path, so a delete or write cannot escape', () => {
    expect(fileNameFor('https://d/../../evil.dmg')).toBe('evil.dmg')
  })

  it('refuses anything that is not an installer', () => {
    expect(fileNameFor('https://d/script.sh')).toBeNull()
    expect(fileNameFor('https://d/')).toBeNull()
    expect(fileNameFor('not a url')).toBeNull()
  })
})

describe('percentOf', () => {
  it('reports a normal fraction', () => {
    expect(percentOf(50, 200)).toBe(25)
  })

  // Servers do not always send content-length; dividing by zero would show NaN.
  it('returns zero when the total is unknown', () => {
    expect(percentOf(1000, 0)).toBe(0)
  })

  it('never exceeds a hundred or goes negative', () => {
    expect(percentOf(500, 100)).toBe(100)
    expect(percentOf(-5, 100)).toBe(0)
  })
})
