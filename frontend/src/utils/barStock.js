import library from '../../../data/cocktails.json' with { type: 'json' }
import { spiritGroup } from './cocktails.js'

export const pantryIngredientIds = new Set([
  'sugar', 'brown-sugar', 'salt-and-pepper', 'hot-water', 'crushed-ice',
])

export const barIngredientGroups = [
  { id: 'spirits', label: 'Spirits', alcoholic: true },
  { id: 'mixers', label: 'Mixers', alcoholic: false },
].map(({ alcoholic, ...section }) => {
  const groups = new Map()
  for (const ingredient of library.ingredients) {
    if (ingredient.isAlcoholic !== alcoholic || pantryIngredientIds.has(ingredient.id)) continue
    const category = library.taxonomy.ingredientCategories.find(({ id }) => id === ingredient.category)
    const label = alcoholic ? spiritGroup(`ingredient:${ingredient.id}`) : category.label
    const id = alcoholic ? label : category.id
    if (!groups.has(id)) groups.set(id, { id, label, ingredients: [] })
    groups.get(id).ingredients.push(ingredient)
  }
  const orderedGroups = alcoholic
    ? [...groups.values()].sort((first, second) => first.label.localeCompare(second.label))
    : library.taxonomy.ingredientCategories.flatMap(({ id }) => groups.has(id) ? [groups.get(id)] : [])
  const combinedGroups = orderedGroups.filter(({ ingredients }) => ingredients.length > 1)
  const otherIngredients = orderedGroups.filter(({ ingredients }) => ingredients.length === 1)
    .flatMap(({ ingredients }) => ingredients)
  if (otherIngredients.length) {
    combinedGroups.push({ id: 'other', label: 'Other', ingredients: otherIngredients })
  }
  return {
    ...section,
    groups: combinedGroups.map((group) => ({
      ...group,
      ingredients: group.ingredients.sort((first, second) => first.name.localeCompare(second.name)),
    })),
  }
})

export function isIngredientAvailable({ ingredientId, alternativeIngredientIds = [] }, stockedIds) {
  return [ingredientId, ...alternativeIngredientIds]
    .some((id) => pantryIngredientIds.has(id) || stockedIds.has(id))
}

export function canMakeCocktail(cocktail, stockedIds) {
  return cocktail.ingredients.every((ingredient) =>
    ingredient.optional || isIngredientAvailable(ingredient, stockedIds))
}
