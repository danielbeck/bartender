import library from '../../../data/cocktails.json'

export const filterDefinitions = library.filters
const ingredientsById = new Map(library.ingredients.map((ingredient) => [ingredient.id, ingredient]))
const familiesById = new Map(library.taxonomy.spiritFamilies.map((family) => [family.id, family]))

function recipeIngredientDefinitions(ingredients) {
  return ingredients.flatMap((ingredient) =>
    [ingredient.ingredientId, ...(ingredient.alternativeIngredientIds || [])].map((id) => {
      const definition = ingredientsById.get(id)
      if (!definition) throw new Error(`Unknown ingredient ID: ${id}`)
      if (typeof definition.isAlcoholic !== 'boolean') {
        throw new Error(`Ingredient ${id} must define isAlcoholic`)
      }
      return definition
    }))
}

export const cocktails = library.cocktails.map((cocktail) => {
  const ingredientDefinitions = recipeIngredientDefinitions(cocktail.ingredients.filter(({ optional }) => !optional))
  return {
    ...cocktail,
    spirits: [...new Set(ingredientDefinitions.filter(({ isAlcoholic }) => isAlcoholic)
      .flatMap((ingredient) => [`ingredient:${ingredient.id}`, ...(ingredient.spiritFamilyIds || []).map((id) => `family:${id}`)]))],
    nonalcoholicIngredients: [...new Set(ingredientDefinitions.filter(({ isAlcoholic }) => !isAlcoholic)
      .map(({ id }) => id))],
    libraryId: cocktail.id,
  }
})
export const cocktailIdAliases = {
  'vieux-carre-variant-2': 'vieux-carre',
}
export const cocktailCategories = library.cocktailCategories
const baseSpiritValues = new Set(cocktails.flatMap((cocktail) => cocktail.baseSpirits.map((id) => `family:${id}`)))

function duplicatesBaseSpirit(value) {
  if (!value.startsWith('ingredient:')) return false
  const ingredient = ingredientsById.get(value.slice(11))
  return (ingredient.spiritFamilyIds || []).some((id) =>
    baseSpiritValues.has(`family:${id}`)
    && (ingredient.id === id || normalize(ingredient.name) === normalize(familiesById.get(id).label)))
}

export function visibleSpirits(values) {
  return values.filter((value) => !duplicatesBaseSpirit(value))
}

function spiritGroup(value) {
  if (baseSpiritValues.has(value)) return 'Base spirits'
  const ingredient = value.startsWith('ingredient:') ? ingredientsById.get(value.slice(11)) : undefined
  return ingredient
    ? library.taxonomy.ingredientCategories.find((category) => category.id === ingredient.category).label
    : 'Other spirit families'
}

export function metadataLabel(value) {
  if (value.startsWith('family:')) return familiesById.get(value.slice(7))?.label || value
  if (value.startsWith('ingredient:')) return ingredientsById.get(value.slice(11))?.name || value
  for (const taxonomy of Object.values(library.taxonomy)) {
    const entry = taxonomy.find((entry) => entry.id === value)
    if (entry) return entry.label
  }
  return value.split(/[- ]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function filterLabel(key, value) {
  const definition = filterDefinitions.find((filter) => filter.key === key)
  return library.taxonomy[definition?.taxonomy]?.find((entry) => entry.id === value)?.label || metadataLabel(value)
}

export function categoryLabel(id) {
  return cocktailCategories.find((category) => category.id === id)?.name || metadataLabel(id)
}

export const filterOptions = Object.fromEntries(filterDefinitions.map(({ key, field }) => [
  key,
  [...new Set(cocktails.flatMap((cocktail) => cocktail[field]))]
    .filter((value) => key !== 'spirit' || !duplicatesBaseSpirit(value))
    .map((value) => ({ value, label: key === 'category' ? categoryLabel(value)
      : key === 'ingredient' ? metadataLabel(ingredientsById.get(value).name)
      : filterLabel(key, value),
      ...(key === 'spirit' ? { group: spiritGroup(value) } : {}),
      ...(key === 'ingredient' ? { group: library.taxonomy.ingredientCategories.find((category) => category.id === ingredientsById.get(value).category).label } : {}),
    }))
    .sort((first, second) => (key === 'spirit'
      ? Number(baseSpiritValues.has(second.value)) - Number(baseSpiritValues.has(first.value))
        || first.group.localeCompare(second.group)
      : key === 'ingredient' ? first.group.localeCompare(second.group)
      : 0) || first.label.localeCompare(second.label)),
]))

export function readFilters(params) {
  return Object.fromEntries([
    ['q', params.get('q') || ''],
    ...filterDefinitions.map(({ key }) => [key, ['flavor', 'spirit', 'ingredient'].includes(key)
      ? [...new Set(params.getAll(key).filter(Boolean))]
      : params.get(key) || '']),
  ])
}

export function librarySearch(values, currentSearch = '') {
  const params = new URLSearchParams(currentSearch)
  for (const key of ['q', ...filterDefinitions.map(({ key }) => key)]) {
    if (Array.isArray(values[key])) {
      params.delete(key)
      for (const value of new Set(values[key].filter(Boolean))) params.append(key, value)
    } else if (values[key]) params.set(key, values[key])
    else params.delete(key)
  }
  const search = params.toString()
  return search ? `?${search}` : ''
}

function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function filterCocktails(values) {
  const terms = normalize(values.q || '').trim().split(/\s+/).filter(Boolean)
  return cocktails.filter((cocktail) => {
    const searchable = normalize([
      cocktail.name,
      ...cocktail.categories.map(categoryLabel),
      ...cocktail.baseSpirits,
      ...cocktail.flavorProfile,
      ...cocktail.ingredients.map((ingredient) => ingredient.name),
      ...cocktail.garnish,
      ...filterDefinitions.flatMap(({ field }) => cocktail[field]),
    ].join(' ').replace(/-/g, ' '))
    return terms.every((term) => searchable.includes(term))
      && filterDefinitions.every(({ key, field }) => Array.isArray(values[key])
        ? values[key].every((value) => cocktail[field].includes(value))
        : !values[key] || (Array.isArray(cocktail[field])
          ? cocktail[field].includes(values[key])
          : cocktail[field] === values[key]))
  }).sort((first, second) => first.name.localeCompare(second.name))
}
