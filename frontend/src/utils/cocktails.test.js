import assert from 'node:assert/strict'
import test from 'node:test'
import library from '../../../data/cocktails.json' with { type: 'json' }
import {
  cocktails, cocktailIdAliases, filterDefinitions, filterGroups, filterScale,
  filterCocktails, filterOptions, groupCocktailsByCategory, ingredientFilters, librarySearch, readFilters,
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

test('results appear in exactly one valid category, in source order, with no empty groups', () => {
  for (const cocktail of cocktails) {
    assert.equal(cocktail.categories.length, 1, cocktail.id)
    assert.ok(library.cocktailCategories.some(({ id }) => id === cocktail.categories[0]), cocktail.id)
  }
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
      assert.equal(groups.filter((group) => group.cocktails.includes(cocktail)).length, 1)
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

test('Spirits groups family choices with their ingredients without changing available values', () => {
  const options = filterOptions.spirit
  const ingredients = new Map(library.ingredients.map((ingredient) => [ingredient.id, ingredient]))
  const families = new Map(library.taxonomy.spiritFamilies.map((family) => [family.id, family]))
  const ancestors = (id) => {
    const ids = []
    while (id) {
      assert.ok(!ids.includes(id), `Cyclic family: ${id}`)
      assert.ok(families.has(id), `Unknown family: ${id}`)
      ids.push(id)
      id = families.get(id).parentId
    }
    return ids
  }
  assert.equal(new Set(options.map(({ value }) => value)).size, options.length)
  const groups = [...new Set(options.map(({ group }) => group))]
  assert.deepEqual(groups, [...groups].sort((a, b) =>
    Number(a === 'Other') - Number(b === 'Other') || a.localeCompare(b)))
  assert.ok(!groups.includes('Base spirits'))
  assert.ok(!groups.includes('Liqueur'))
  assert.ok(!options.some(({ value }) => value === 'family:liqueur'))
  for (const id of ['pimms-no-1', 'elderflower-liqueur', 'licor-43']) {
    assert.equal(options.find(({ value }) => value === `ingredient:${id}`).group, 'Liqueurs')
  }
  const originalGroup = (option) => {
    const familyId = option.value.startsWith('family:')
      ? option.value.slice(7) : ingredients.get(option.value.slice(11)).spiritFamilyIds?.[0]
    return familyId ? families.get(ancestors(familyId).at(-1)).label
      : library.taxonomy.ingredientCategories.find(({ id }) => id === ingredients.get(option.value.slice(11)).category).label
  }
  for (const option of options) {
    const original = originalGroup(option)
    const count = options.filter((entry) => originalGroup(entry) === original).length
    assert.equal(option.group, count === 1 ? 'Other' : original)
  }
  for (const group of groups) {
    const entries = options.filter((option) => option.group === group)
    assert.deepEqual(entries, [...entries].sort((a, b) =>
      (group !== 'Other' ? Number(b.value.startsWith('family:')) - Number(a.value.startsWith('family:')) : 0)
      || (group !== 'Other' && a.value.startsWith('family:') && b.value.startsWith('family:')
        ? ancestors(a.value.slice(7)).length - ancestors(b.value.slice(7)).length : 0)
      || a.label.localeCompare(b.label)))
    const start = options.indexOf(entries[0])
    assert.deepEqual(options.slice(start, start + entries.length), entries)
  }
  assert.equal(options.find(({ value }) => value === 'ingredient:white-rum').group, 'Rum')
  assert.equal(options.find(({ value }) => value === 'family:rum').group, 'Rum')
})

test('Whiskey groups and matches its subfamilies without broadening specific filters', () => {
  const broad = filterCocktails({ spirit: ['family:whiskey'] })
  assert.ok(broad.length > 0)
  for (const family of ['bourbon', 'rye', 'scotch', 'irish-whiskey']) {
    const specific = filterCocktails({ spirit: [`family:${family}`] })
    assert.ok(specific.length > 0, family)
    assert.ok(specific.every((cocktail) => broad.includes(cocktail)), family)
    assert.equal(filterOptions.spirit.find(({ value }) => value === `family:${family}`).group, 'Whiskey')
    for (const cocktail of specific) {
      assert.ok(cocktail.ingredients.filter(({ optional }) => !optional).some((ingredient) =>
        [ingredient.ingredientId, ...(ingredient.alternativeIngredientIds || [])].some((id) =>
          library.ingredients.find((entry) => entry.id === id).spiritFamilyIds?.includes(family))), family)
    }
  }
  const grouped = filterOptions.spirit.filter(({ group }) => group === 'Whiskey')
  assert.equal(grouped[0].value, 'family:whiskey')
  assert.ok(grouped.some(({ value }) => value === 'ingredient:islay-scotch'))
  assert.ok(grouped.some(({ value }) => value === 'ingredient:bacon-fat-washed-bourbon'))
  assert.ok(broad.some((cocktail) => !cocktail.spirits.includes('family:scotch')))
})

test('Agave groups tequila and mezcal while preserving specific search options', () => {
  const options = filterOptions.spirit.filter(({ group }) => group === 'Agave')
  assert.equal(options[0].value, 'family:agave')
  for (const value of ['family:tequila', 'family:mezcal', 'ingredient:reposado-tequila']) {
    assert.ok(options.some((option) => option.value === value), value)
  }
  const agave = filterCocktails({ spirit: ['family:agave'] })
  const tequila = filterCocktails({ spirit: ['family:tequila'] })
  const mezcal = filterCocktails({ spirit: ['family:mezcal'] })
  assert.ok(tequila.length > 0 && mezcal.length > 0)
  assert.deepEqual(new Set(agave), new Set([...tequila, ...mezcal]))
  assert.ok(tequila.some((cocktail) => !mezcal.includes(cocktail)))
  assert.ok(mezcal.some((cocktail) => !tequila.includes(cocktail)))
})

test('Dark Rum belongs to the Rum group and retains its specific filter', () => {
  assert.equal(filterOptions.spirit.find(({ value }) => value === 'family:dark-rum').group, 'Rum')
  assert.ok(!filterOptions.spirit.some(({ group }) => group === 'Dark Rum'))
  const rum = filterCocktails({ spirit: ['family:rum'] })
  const darkRum = filterCocktails({ spirit: ['family:dark-rum'] })
  assert.ok(darkRum.length > 0)
  assert.ok(darkRum.every((cocktail) => rum.includes(cocktail)))
  assert.ok(rum.some((cocktail) => !darkRum.includes(cocktail)))
})

test('Wine unifies still and sparkling wines while retaining a specific sparkling filter', () => {
  const options = filterOptions.spirit.filter(({ group }) => group === 'Wine')
  assert.equal(options[0].value, 'family:wine')
  for (const value of ['family:sparkling-wine', 'ingredient:champagne', 'ingredient:prosecco', 'ingredient:dry-red-wine', 'ingredient:dry-white-wine']) {
    assert.ok(options.some((option) => option.value === value), value)
  }
  assert.ok(!filterOptions.spirit.some(({ group }) => group === 'Wine & Sparkling Wine'))
  const wine = filterCocktails({ spirit: ['family:wine'] })
  const sparkling = filterCocktails({ spirit: ['family:sparkling-wine'] })
  assert.ok(sparkling.length > 0)
  assert.ok(sparkling.every((cocktail) => wine.includes(cocktail)))
  assert.ok(wine.some((cocktail) => !sparkling.includes(cocktail)))
  for (const cocktail of cocktails.filter(({ spirits }) => spirits.includes('ingredient:dry-red-wine'))) {
    assert.ok(wine.includes(cocktail))
  }
})

test('ingredient links select Spirits or Mixers and clear previous search filters', () => {
  assert.deepEqual(ingredientFilters({ ingredientId: 'gin', name: 'gin' }), { spirit: ['family:gin'] })
  assert.deepEqual(ingredientFilters({ ingredientId: 'white-rum', name: 'white rum' }), { spirit: ['ingredient:white-rum'] })
  assert.deepEqual(ingredientFilters({ ingredientId: 'lime-juice', name: 'lime juice' }), { ingredient: ['lime-juice'] })
  for (const cocktail of cocktails) {
    for (const ingredient of cocktail.ingredients) {
      const selection = ingredientFilters(ingredient)
      const filters = readFilters(new URLSearchParams(librarySearch(selection, '?q=old&spirit=family:vodka&ingredient=tonic-water')))
      if (selection.q) {
        assert.equal(selection.q, ingredient.name)
        const definition = library.ingredients.find(({ id }) => id === ingredient.ingredientId)
        const key = definition.isAlcoholic ? 'spirit' : 'ingredient'
        const value = definition.isAlcoholic ? `ingredient:${definition.id}` : definition.id
        assert.ok(!filterOptions[key].some((option) => option.value === value))
        continue
      }
      assert.equal(filters.q, '')
      const [key] = Object.keys(selection)
      assert.deepEqual(filters[key], selection[key])
      assert.deepEqual(filters[key === 'spirit' ? 'ingredient' : 'spirit'], [])
      assert.ok(filterOptions[key].some((option) => option.value === selection[key][0]))
      if (!ingredient.optional) assert.ok(filterCocktails(filters).includes(cocktail))
    }
  }
  assert.throws(() => ingredientFilters({ ingredientId: 'unknown', name: 'unknown' }), /Unknown ingredient ID/)
})
