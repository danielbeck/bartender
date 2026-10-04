# Cocktail library filters

`data/cocktails.json` is the source of truth for alcoholic ingredients. Each
entry in its shared `ingredients` catalog defines an `isAlcoholic` boolean.
Alcoholic entries may define `spiritFamilyIds` referencing `taxonomy.spiritFamilies`
(for example, White Rum references `rum`). Ingredient identity remains its catalog
ID. Filters distinguish `ingredient:white-rum` from `family:rum`.

Recipes reference catalog entries through `ingredientId` and optional
`alternativeIngredientIds`. The UI uses those references and the alcohol
flags to build the Spirits filter; there is no separate hardcoded catalog.
Alcohol-containing bitters are included as alcoholic ingredients.

Recipe IDs are unique and permanent, including variant IDs. Variants have an
explicit `variant` number rather than depending on array order. Existing recipe
URLs are preserved; when duplicate recipes are consolidated, the retired recipe
ID remains an alias to its canonical recipe. Taxonomy labels supply filter
labels and category headings.

The source's `filters` array defines filter keys, recipe fields, labels, and
optional taxonomy references. The UI reads these definitions directly; no
separate validation module is loaded. Alternatives retain
their existing behavior: all listed alternatives are available filter matches.
Special handling of mutually exclusive alternatives is intentionally deferred.
Optional ingredients appear in recipe details but do not count as required
ingredients for spirit or nonalcoholic ingredient filters.

Nonalcoholic Ingredients lists catalog entries with `isAlcoholic: false`
that occur in recipes, grouped by ingredient category and alphabetized.
It supports multiple selections and matches recipes containing every selected
ingredient, including listed ingredient alternatives. Choose "Any nonalcoholic
ingredients" to clear it. Selections use repeated `ingredient` query parameters.

Spirits matches alcoholic ingredients anywhere in a recipe, not only its base
spirits. It includes liqueurs, aperitifs, vermouths, and wines. Ingredient
variants also match their spirit family: for example, white rum matches Rum,
and rye whiskey matches Rye.
Spirits supports multiple selections, and a drink must contain every selected
spirit to match. Select "Any spirits" to clear the selection. Selections use
repeated `spirit` query parameters, such as
`?spirit=family:gin&spirit=ingredient:campari`.
The list groups values from the recipes' `baseSpirits` first, followed by
alcoholic ingredients grouped by their source-defined ingredient category.
The remaining groups and their entries are alphabetized.
An ingredient with the same ID or label as a listed base-spirit family is
omitted from the other group to avoid duplicates; distinct variants remain.

Flavor Notes supports multiple selections. A recipe matches only when it
contains every selected note. Select "Any flavor notes" to clear these
selections; resetting the filters also clears them.

Selections are stored as repeated `flavor` query parameters, such as
`?flavor=citrus&flavor=fruity`. Existing links with a single `flavor` parameter
remain supported.
