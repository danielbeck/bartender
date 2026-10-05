import assert from 'node:assert/strict'
import test from 'node:test'
import { barIngredientGroups, canMakeCocktail, pantryIngredientIds } from './barStock.js'
import { cocktails, filterCocktails } from './cocktails.js'

test('stock groups list specific ingredients once, spirits before mixers, without pantry basics', () => {
  assert.deepEqual(barIngredientGroups.map(({ label }) => label), ['Spirits', 'Mixers'])
  const ids = barIngredientGroups.flatMap(({ groups }) =>
    groups.flatMap(({ ingredients }) => ingredients.map(({ id }) => id)))
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.includes('gin') && ids.includes('white-rum') && ids.includes('simple-syrup'))
  assert.ok(ids.every((id) => !pantryIngredientIds.has(id)))
})

test('every required ingredient must be stocked, without broad family substitutions', () => {
  const recipe = { ingredients: [{ ingredientId: 'white-rum' }, { ingredientId: 'lime-juice' }] }
  assert.equal(canMakeCocktail(recipe, new Set(['white-rum', 'lime-juice'])), true)
  assert.equal(canMakeCocktail(recipe, new Set(['white-rum'])), false)
  assert.equal(canMakeCocktail(recipe, new Set(['rum', 'lime-juice'])), false)
})

test('one explicit alternative suffices; optional ingredients and pantry basics are ignored', () => {
  const recipe = { ingredients: [
    { ingredientId: 'bourbon', alternativeIngredientIds: ['rye-whiskey'] },
    { ingredientId: 'sugar' },
    { ingredientId: 'crushed-ice' },
    { ingredientId: 'hot-water' },
    { ingredientId: 'salt-and-pepper' },
    { ingredientId: 'egg-white', optional: true },
  ] }
  assert.equal(canMakeCocktail(recipe, new Set(['rye-whiskey'])), true)
  assert.equal(canMakeCocktail(recipe, new Set()), false)
})

test('real recipes combine availability with search without changing the all-drinks results', () => {
  const available = new Set(['gin', 'tonic-water'])
  const all = filterCocktails({ q: '' })
  assert.equal(all.length, cocktails.length)
  const matching = filterCocktails({ q: 'gin' }).filter((cocktail) => canMakeCocktail(cocktail, available))
  assert.ok(matching.some(({ id }) => id === 'gin-and-tonic'))
  assert.ok(matching.every((cocktail) => canMakeCocktail(cocktail, available)))
  assert.ok(!matching.some(({ id }) => id === 'negroni'))
})
