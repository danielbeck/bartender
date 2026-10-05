import assert from 'node:assert/strict'
import test from 'node:test'
import library from '../../../data/cocktails.json' with { type: 'json' }
import {
  cocktails, cocktailIdAliases, filterDefinitions, filterGroups, filterScale,
  filterCocktails, groupCocktailsByCategory, librarySearch, readFilters,
} from './cocktails.js'

test('filter configuration references valid controls, groups, and taxonomies', () => {
  assert.equal(new Set(filterDefinitions.map(({ key }) => key)).size, filterDefinitions.length)
  for (const definition of filterDefinitions) {
    assert.equal(typeof definition.multiple, 'boolean', definition.key)
    assert.ok(['hidden', 'select', 'slider', 'toggle'].includes(definition.control), definition.key)
    if (definition.taxonomy) assert.ok(library.taxonomy[definition.taxonomy], definition.key)
    if (definition.control === 'hidden') continue
    if (definition.sliderGroup) {
      assert.equal(definition.control, 'slider')
      assert.ok(library.sliderGroups.some(({ key }) => key === definition.sliderGroup), definition.key)
    } else {
      assert.ok(filterGroups.some(({ id }) => id === definition.group), definition.key)
      assert.ok(Number.isInteger(definition.order), definition.key)
    }
    if (definition.control === 'select') assert.ok(definition.emptyLabel, definition.key)
    if (definition.control === 'slider') {
      assert.deepEqual(filterScale(definition).levels, library.taxonomy[definition.taxonomy].map(({ id }) => id))
    }
    if (definition.control === 'toggle') {
      assert.equal(definition.states.length, 3)
      assert.equal(definition.states[1].value, '')
      for (const state of definition.states) {
        assert.equal(typeof state.label, 'string')
        if (state.value) assert.ok(library.taxonomy[definition.taxonomy].some(({ id }) => id === state.value))
      }
    }
  }
})

test('visible filters retain their order and hidden filters remain available', () => {
  assert.deepEqual(filterGroups.map(({ definitions }) => definitions.map(({ key }) => key)), [
    ['spirit', 'ingredient'],
    ['strength', 'glass', 'flavors', 'carbonation', 'temperature'],
  ])
  for (const key of ['category', 'method', 'flavor', 'difficulty']) {
    assert.equal(filterDefinitions.find((definition) => definition.key === key).control, 'hidden')
  }
  const filters = readFilters(new URLSearchParams('method=shake&flavor=citrusy'))
  const results = filterCocktails(filters)
  assert.ok(results.length > 0)
  assert.ok(results.every(({ method, flavorProfile }) => method === 'shake' && flavorProfile.includes('citrusy')))
})

test('results appear in every matching category, in source order, with no empty groups', () => {
  for (const filters of [{}, { q: 'gin' }, { category: 'classic' }, { q: 'no-such-cocktail' }]) {
    const results = filterCocktails(filters)
    const groups = groupCocktailsByCategory(results)
    assert.deepEqual(groups.map(({ id }) => id), library.cocktailCategories
      .filter(({ id }) => results.some(({ categories }) => categories.includes(id))).map(({ id }) => id))
    for (const group of groups) {
      assert.ok(group.cocktails.length > 0)
      assert.ok(group.name && group.description)
      assert.deepEqual(group.cocktails, results.filter(({ categories }) => categories.includes(group.id)))
    }
    for (const cocktail of results) {
      assert.equal(groups.filter((group) => group.cocktails.includes(cocktail)).length, cocktail.categories.length)
    }
  }
})

test('Flavors groups all three taxonomy-backed sliders and preserves filtering', () => {
  const flavors = filterGroups.flatMap(({ definitions }) => definitions).find(({ key }) => key === 'flavors')
  assert.equal(flavors.label, 'Flavors')
  assert.deepEqual(flavors.scales.map(({ key }) => key), ['sweetness', 'sourness', 'bitterness'])
  const values = Object.fromEntries(flavors.scales.map(({ key }) => [key, cocktails[0][key]]))
  const filters = readFilters(new URLSearchParams(librarySearch(values)))
  const results = filterCocktails(filters)
  assert.ok(results.length > 0)
  assert.ok(results.every((cocktail) => Object.entries(values).every(([key, value]) => cocktail[key] === value)))
  const reset = readFilters(new URLSearchParams(librarySearch({}, librarySearch(values))))
  assert.ok(flavors.scales.every(({ key }) => reset[key] === ''))
})

test('difficulty remains filterable through URLs without a search control', () => {
  const difficulty = cocktails[0].difficulty
  const filters = readFilters(new URLSearchParams(librarySearch({ difficulty })))
  const results = filterCocktails(filters)
  assert.equal(filters.difficulty, difficulty)
  assert.ok(results.length > 0)
  assert.ok(results.every((cocktail) => cocktail.difficulty === difficulty))
})

test('selection modes and URL serialization follow source definitions', () => {
  const filters = readFilters(new URLSearchParams(
    'spirit=family:gin&spirit=family:gin&spirit=family:vodka&ingredient=lime-juice&flavor=citrusy&flavor=tart&glass=coupe'))
  for (const { key, multiple } of filterDefinitions) assert.equal(Array.isArray(filters[key]), multiple, key)
  assert.deepEqual(filters.spirit, ['family:gin', 'family:vodka'])
  assert.deepEqual(readFilters(new URLSearchParams(librarySearch(filters))), filters)
  const reset = readFilters(new URLSearchParams(librarySearch({}, '?method=shake&flavor=tart&ingredient=lime-juice')))
  assert.equal(reset.method, '')
  assert.deepEqual(reset.flavor, [])
  assert.deepEqual(reset.ingredient, [])
})

test('source recipe aliases point to canonical recipes without duplicate entries', () => {
  assert.deepEqual(cocktailIdAliases, library.cocktailIdAliases)
  for (const [alias, canonical] of Object.entries(cocktailIdAliases)) {
    assert.ok(!cocktails.some(({ id }) => id === alias))
    assert.ok(cocktails.some(({ id }) => id === canonical))
  }
})
