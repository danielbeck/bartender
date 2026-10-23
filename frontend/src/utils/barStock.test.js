import assert from 'node:assert/strict'
import test from 'node:test'
import { barIngredientGroups, canMakeCocktail, isIngredientAvailable, pantryIngredientIds } from './barStock.js'
import { cocktails, filterCocktails, spiritGroup } from './cocktails.js'
import library from '../../../data/cocktails.json' with { type: 'json' }

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

test('bar spirits use search family grouping while mixers retain category order', () => {
  const [spirits, mixers] = barIngredientGroups
  const labels = spirits.groups.filter(({ id }) => id !== 'other').map(({ label }) => label)
  assert.deepEqual(labels, [...labels].sort((a, b) => a.localeCompare(b)))
  for (const group of spirits.groups) {
    for (const ingredient of group.ingredients) {
      if (group.id !== 'other') assert.equal(group.label, spiritGroup(`ingredient:${ingredient.id}`))
    }
    const names = group.ingredients.map(({ name }) => name)
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)))
  }
  const whiskey = spirits.groups.find(({ label }) => label === 'Whiskey')
  for (const id of ['bourbon', 'rye-whiskey', 'irish-whiskey', 'scotch-whisky', 'islay-scotch']) {
    assert.ok(whiskey.ingredients.some((ingredient) => ingredient.id === id), id)
  }
  const wine = spirits.groups.find(({ label }) => label === 'Wine')
  for (const id of ['dry-red-wine', 'champagne', 'prosecco']) {
    assert.ok(wine.ingredients.some((ingredient) => ingredient.id === id), id)
  }
  const stocked = barIngredientGroups.flatMap(({ groups }) => groups.flatMap(({ ingredients }) => ingredients.map(({ id }) => id)))
  assert.deepEqual([...stocked].sort(), library.ingredients.filter(({ id }) => !pantryIngredientIds.has(id)).map(({ id }) => id).sort())
  assert.deepEqual(mixers.groups.filter(({ id }) => id !== 'other').map(({ id }) => id), library.taxonomy.ingredientCategories
    .filter(({ id }) => library.ingredients.filter((ingredient) =>
      !ingredient.isAlcoholic && ingredient.category === id && !pantryIngredientIds.has(ingredient.id)).length > 1)
    .map(({ id }) => id))
})

test('single-item bar groups combine into an alphabetical Other group at the end of each section', () => {
  for (const section of barIngredientGroups) {
    const counts = new Map()
    const ingredients = library.ingredients.filter((ingredient) =>
      ingredient.isAlcoholic === (section.id === 'spirits') && !pantryIngredientIds.has(ingredient.id))
    const groupKey = (ingredient) => section.id === 'spirits'
      ? spiritGroup(`ingredient:${ingredient.id}`) : ingredient.category
    for (const ingredient of ingredients) {
      const key = groupKey(ingredient)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    const expected = ingredients.filter((ingredient) => counts.get(groupKey(ingredient)) === 1)
      .sort((a, b) => a.name.localeCompare(b.name))
    const other = section.groups.find(({ id }) => id === 'other')
    if (expected.length) {
      assert.equal(section.groups.at(-1), other)
      assert.equal(other.label, 'Other')
      assert.deepEqual(other.ingredients, expected)
    } else {
      assert.equal(other, undefined)
    }
    assert.ok(section.groups.filter(({ id }) => id !== 'other')
      .every(({ ingredients }) => ingredients.length > 1))
  }
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

test('ingredient availability respects exact stock, alternatives, and pantry basics', () => {
  const stockedIds = new Set(['gin', 'rye-whiskey'])
  assert.equal(isIngredientAvailable({ ingredientId: 'gin' }, stockedIds), true)
  assert.equal(isIngredientAvailable({ ingredientId: 'white-rum' }, stockedIds), false)
  assert.equal(isIngredientAvailable({ ingredientId: 'bourbon', alternativeIngredientIds: ['rye-whiskey'] }, stockedIds), true)
  for (const ingredientId of pantryIngredientIds) {
    assert.equal(isIngredientAvailable({ ingredientId }, new Set()), true)
  }
  const optional = { ingredientId: 'egg-white', optional: true }
  assert.equal(isIngredientAvailable(optional, stockedIds), false)
  assert.equal(isIngredientAvailable(optional, new Set(['egg-white'])), true)
  assert.equal(canMakeCocktail({ ingredients: [optional] }, stockedIds), true)
})
