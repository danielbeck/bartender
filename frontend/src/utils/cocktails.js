import library from '../../../data/cocktails.json'

const idCounts = new Map()
const idTotals = new Map()
library.cocktails.forEach(({ id }) => idTotals.set(id, (idTotals.get(id) || 0) + 1))

export const cocktails = library.cocktails.map((cocktail) => {
  const occurrence = (idCounts.get(cocktail.id) || 0) + 1
  idCounts.set(cocktail.id, occurrence)
  return {
    ...cocktail,
    libraryId: occurrence === 1 ? cocktail.id : `${cocktail.id}-variant-${occurrence}`,
    variant: idTotals.get(cocktail.id) > 1 ? occurrence : null,
  }
})
export const cocktailCategories = library.cocktailCategories

export function metadataLabel(value) {
  return value.split(/[- ]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export const filterDefinitions = [
  { key: 'category', field: 'categories', label: 'Category' },
  { key: 'spirit', field: 'baseSpirits', label: 'Base spirit' },
  { key: 'flavor', field: 'flavorProfile', label: 'Flavor' },
  { key: 'method', field: 'method', label: 'Method' },
  { key: 'glass', field: 'glass', label: 'Glass' },
  { key: 'strength', field: 'strength', label: 'Strength' },
  { key: 'difficulty', field: 'difficulty', label: 'Difficulty' },
  { key: 'sweetness', field: 'sweetness', label: 'Sweetness' },
  { key: 'sourness', field: 'sourness', label: 'Sourness' },
  { key: 'bitterness', field: 'bitterness', label: 'Bitterness' },
  { key: 'carbonation', field: 'carbonation', label: 'Carbonation' },
  { key: 'temperature', field: 'temperature', label: 'Temperature' },
]

export function categoryLabel(id) {
  return cocktailCategories.find((category) => category.id === id)?.name || metadataLabel(id)
}

export const filterOptions = Object.fromEntries(filterDefinitions.map(({ key, field }) => [
  key,
  [...new Set(cocktails.flatMap((cocktail) => cocktail[field]))]
    .map((value) => ({ value, label: key === 'category' ? categoryLabel(value) : metadataLabel(value) }))
    .sort((first, second) => first.label.localeCompare(second.label)),
]))

export function readFilters(params) {
  return Object.fromEntries([
    ['q', params.get('q') || ''],
    ...filterDefinitions.map(({ key }) => [key, params.get(key) || '']),
  ])
}

export function librarySearch(values, currentSearch = '') {
  const params = new URLSearchParams(currentSearch)
  for (const key of ['q', ...filterDefinitions.map(({ key }) => key)]) {
    if (values[key]) params.set(key, values[key])
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
      && filterDefinitions.every(({ key, field }) => !values[key]
        || (Array.isArray(cocktail[field])
          ? cocktail[field].includes(values[key])
          : cocktail[field] === values[key]))
  }).sort((first, second) => first.name.localeCompare(second.name))
}
