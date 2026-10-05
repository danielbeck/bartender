import library from '../../../data/cocktails.json' with { type: 'json' }

export const pantryIngredientIds = new Set([
  'sugar', 'brown-sugar', 'salt-and-pepper', 'hot-water', 'crushed-ice',
])

export const barIngredientGroups = [
  { id: 'spirits', label: 'Spirits', alcoholic: true },
  { id: 'mixers', label: 'Mixers', alcoholic: false },
].map(({ alcoholic, ...section }) => ({
  ...section,
  groups: library.taxonomy.ingredientCategories.map(({ id, label }) => ({
    id,
    label,
    ingredients: library.ingredients
      .filter((ingredient) => ingredient.isAlcoholic === alcoholic
        && ingredient.category === id && !pantryIngredientIds.has(ingredient.id))
      .sort((first, second) => first.name.localeCompare(second.name)),
  })).filter(({ ingredients }) => ingredients.length),
}))

export function canMakeCocktail(cocktail, stockedIds) {
  return cocktail.ingredients.every(({ ingredientId, alternativeIngredientIds = [], optional }) =>
    optional || [ingredientId, ...alternativeIngredientIds]
      .some((id) => pantryIngredientIds.has(id) || stockedIds.has(id)))
}
