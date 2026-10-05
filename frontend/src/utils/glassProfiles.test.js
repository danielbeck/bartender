import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { glassHandles, glassProfiles } from './glassProfiles.js'

const library = JSON.parse(readFileSync(new URL('../../../data/cocktails.json', import.meta.url), 'utf8'))

test('provides a distinct SVG profile for every glass type', () => {
  assert.deepEqual(Object.keys(glassProfiles).sort(), library.taxonomy.glasses.map(({ id }) => id).sort())
  assert.equal(new Set(Object.values(glassProfiles)).size, library.taxonomy.glasses.length)
  for (const profile of Object.values(glassProfiles)) {
    assert.match(profile, /^M/)
    assert.match(profile, /Z/)
  }
})

test('every cocktail references an available glass profile', () => {
  for (const cocktail of library.cocktails) {
    assert.ok(glassProfiles[cocktail.glass], `${cocktail.id}: ${cocktail.glass}`)
  }
})

test('handled glasses keep their handle outlines separate from the filled bodies', () => {
  assert.deepEqual(Object.keys(glassHandles).sort(), ['irish-coffee', 'mug'])
  for (const [glass, handle] of Object.entries(glassHandles)) {
    assert.match(handle, /^M/)
    assert.ok(!glassProfiles[glass].includes(handle))
  }
})
