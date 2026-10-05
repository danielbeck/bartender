import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { millilitersPerShot, recipeParts, recipeShots } from './recipeMeasurements.js'

const ingredients = (...amounts) => amounts.map((amount) => ({ amount }))

const quantityValue = (amount) => amount.replace(/ (?:shots?|parts?)$/, '').split(' ')
  .reduce((sum, part) => sum + ({ '¼': 0.25, '½': 0.5, '¾': 0.75 }[part] ?? Number(part)), 0)

test('converts shots using 45 ml and simplified quarter fractions', () => {
  assert.equal(millilitersPerShot, 45)
  assert.deepEqual(recipeShots(ingredients('45 ml', '22.5 ml', '90 ml', '60 ml', '50 ml', '15 ml', '5 ml')),
    ['1 shot', '½ shot', '2 shots', '1 ¼ shots', '1 shot', '¼ shot', '0 shots'])
})

test('shot conversion preserves non-ml amounts without mutating ingredients', () => {
  const original = ingredients('30 ml', '2 dashes', '1 (optional)', '1 cup', 'to taste')
  const snapshot = structuredClone(original)
  assert.deepEqual(recipeShots(original), ['¾ shot', '2 dashes', '1 (optional)', '1 cup', 'to taste'])
  assert.deepEqual(original, snapshot)
})

test('shot rounding uses the nearest quarter for every catalog volume', () => {
  const library = JSON.parse(readFileSync(new URL('../../../data/cocktails.json', import.meta.url), 'utf8'))
  for (const cocktail of library.cocktails) {
    const converted = recipeShots(cocktail.ingredients)
    cocktail.ingredients.forEach(({ amount }, index) => {
      if (!amount.endsWith(' ml')) {
        assert.equal(converted[index], amount)
        return
      }
      const shots = quantityValue(converted[index])
      assert.equal(shots, Math.round(Number.parseFloat(amount) / millilitersPerShot * 4) / 4, cocktail.id)
      assert.ok(Math.abs(shots * millilitersPerShot - Number.parseFloat(amount)) <= millilitersPerShot / 8, cocktail.id)
    })
  }
})

test('shot rounding rounds halfway amounts up and small amounts to zero', () => {
  assert.deepEqual(recipeShots(ingredients('0 ml', '5 ml', '5.625 ml', '16.875 ml', '33.75 ml')),
    ['0 shots', '0 shots', '¼ shot', '½ shot', '¾ shot'])
})

test('keeps simple whole-number ratios and scales larger ratios below five', () => {
  assert.deepEqual(recipeParts(ingredients('45 ml', '30 ml', '15 ml')), {
    amounts: ['3 parts', '2 parts', '1 part'],
    millilitersPerPart: 15,
    rounded: false,
  })
  assert.deepEqual(recipeParts(ingredients('50 ml', '20 ml', '25 ml')), {
    amounts: ['4 parts', '1 ½ parts', '2 parts'],
    millilitersPerPart: 12.5,
    rounded: true,
  })
})

test('handles decimal volumes and equal-parts recipes', () => {
  assert.deepEqual(recipeParts(ingredients('60 ml', '7.5 ml')), {
    amounts: ['4 parts', '½ parts'],
    millilitersPerPart: 15,
    rounded: false,
  })
  assert.deepEqual(recipeParts(ingredients('22.5 ml', '22.5 ml')), {
    amounts: ['1 part', '1 part'],
    millilitersPerPart: 22.5,
    rounded: false,
  })
})

test('simplifies the Ramos Gin Fizz with only one fractional ingredient', () => {
  assert.deepEqual(recipeParts(ingredients('45 ml', '15 ml', '15 ml', '25 ml', '30 ml')), {
    amounts: ['3 parts', '1 part', '1 part', '1 ¾ parts', '2 parts'],
    millilitersPerPart: 15,
    rounded: true,
  })
})

test('prioritizes accuracy when the size limits make 10% rounding impossible', () => {
  const converted = recipeParts(ingredients('120 ml', '5 ml'))
  assert.equal(converted.millilitersPerPart, 22.5)
  assert.deepEqual(converted.amounts, ['4 ¾ parts', '¼ parts'])
  assert.equal(converted.rounded, true)
})

test('preserves non-ml amounts and does not mutate the recipe', () => {
  const original = ingredients('30 ml', '1 (optional)', '2 dashes', '8 leaves', '1 cup', 'to taste')
  const snapshot = structuredClone(original)
  assert.deepEqual(recipeParts(original).amounts,
    ['1 part', '1 (optional)', '2 dashes', '8 leaves', '1 cup', 'to taste'])
  assert.deepEqual(original, snapshot)
  assert.deepEqual(recipeParts(ingredients('2 dashes')), {
    amounts: ['2 dashes'],
    millilitersPerPart: null,
    rounded: false,
  })
})

test('every catalog recipe uses quarter-parts below five and reports approximation', () => {
  const library = JSON.parse(readFileSync(new URL('../../../data/cocktails.json', import.meta.url), 'utf8'))
  for (const cocktail of library.cocktails) {
    const converted = recipeParts(cocktail.ingredients)
    let rounded = false
    let maximumError = 0
    cocktail.ingredients.forEach(({ amount }, index) => {
      if (amount.endsWith(' ml')) {
        const parts = quantityValue(converted.amounts[index])
        assert.ok(parts >= 0.25 && parts < 5, `${cocktail.id}: ${parts} parts`)
        assert.ok(Number.isInteger(parts * 4), cocktail.id)
        const exactParts = Number.parseFloat(amount) / converted.millilitersPerPart
        assert.equal(parts, Math.min(4.75, Math.max(0.25, Math.round(exactParts * 4) / 4)), cocktail.id)
        const error = Math.abs(parts * converted.millilitersPerPart - Number.parseFloat(amount))
        if (error > 1e-9) rounded = true
        maximumError = Math.max(maximumError, error / Number.parseFloat(amount))
      } else {
        assert.equal(converted.amounts[index], amount, cocktail.id)
      }
    })
    assert.equal(converted.rounded, rounded, cocktail.id)
    const volumes = cocktail.ingredients.filter(({ amount }) => amount.endsWith(' ml')).map(({ amount }) => Number.parseFloat(amount))
    const largest = Math.max(...volumes)
    const hasAcceptableMeasure = Array.from({ length: Math.floor(largest / 2.5) }, (_, index) => (index + 1) * 2.5)
      .some((measure) => volumes.every((volume) => {
        const parts = Math.min(4.75, Math.max(0.25, Math.round(volume / measure * 4) / 4))
        return Math.abs(parts * measure - volume) / volume <= 0.1 + Number.EPSILON
      }))
    if (hasAcceptableMeasure) assert.ok(maximumError <= 0.1 + Number.EPSILON, cocktail.id)
  }
})
