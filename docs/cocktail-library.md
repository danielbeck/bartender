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
Search results are grouped in source category order, with a heading and
description only for categories containing matching cocktails. A cocktail
appears in every category it belongs to, alphabetized within each group.
The result count counts unique cocktails, not repeated cards. There is no
category dropdown; existing category tags and URL filters remain supported.

The source's `filters` array defines filter keys, recipe fields, labels,
taxonomy references, and `multiple` selection modes. Each filter's `control`
is `select`, `slider`, `toggle`, or `hidden`. Visible filters use `group` and
`order` to reference the source's `filterGroups` and establish display order.
The first row contains Spirits and Mixers; the second contains Strength, Glass,
Flavors, Carbonated, and Temperature, in that order (wrapping on narrow screens).
Selects define `emptyLabel` and optional `illustration`; toggles define their
ordered `states` (the middle state is unfiltered). `controlLabel` optionally
overrides the taxonomy-facing label for controls and active-filter summaries.
Slider levels come directly from the referenced taxonomy in its stored order.
Sliders with a `sliderGroup` share a popup configured by `sliderGroups`, which
defines its label, display group, and order. The "Flavors" popup contains the
sweetness, sourness, and bitterness sliders, each with an unfiltered "any" value.
Slider labels appear above their controls, with the current value to the left
of each slider.
Hidden filters remain searchable, URL-addressable, and available through tags.
Difficulty has no search-interface control; recipe difficulty metadata and
tag-based or URL filtering remain available.
Active-filter descriptions appear beside the result count, outside the
collapsible filter panel, so they remain visible when the controls are closed.
The Reset filters button follows the descriptions on the right, outside the
panel, and is hidden when all filters and search are at their defaults.
The source's `cocktailIdAliases` maps retired IDs to canonical recipe IDs.
The UI reads these definitions directly; no separate validation module is loaded.
Alternatives retain
their existing behavior: all listed alternatives are available filter matches.
Special handling of mutually exclusive alternatives is intentionally deferred.
Optional ingredients appear in recipe details but do not count as required
ingredients for spirit or nonalcoholic ingredient filters.

Recipe details offer ml/parts/shots measurement buttons, defaulting to ml.
Parts compare shared measures in 2.5 ml increments, preferring fewer fractional
amounts, then halves over quarters, then lower rounding error and smaller ratios.
Candidates allow up to 10% error per ingredient; when none satisfy that limit,
the calculator prioritizes the lowest maximum relative error instead.
Amounts use quarter-part increments, with a minimum of 0.25 part for positive
volumes and a maximum of 4.75 parts. For example, 45/15/15/25/30 ml becomes
3/1/1/1.75/2 parts with only the syrup rounded.
The UI shows the ml equivalent of one part and marks recipes
whose proportions have been rounded as approximate.
Shots use 45 ml per shot, rounded to the nearest eighth and displayed as
simplified mixed fractions (for example, 60 ml becomes 1 3/8 shots).
Positive quantities never round down to zero; the minimum is 1/8 shot.
Counts, dashes, cups, and other non-ml measurements remain unchanged.
This is a display conversion only; source recipes are not modified.

Each cocktail card and recipe detail shows an SVG side profile of its glass,
covering all entries in `taxonomy.glasses`. Glass profiles are shared through
the `GlassProfile` component and `glassProfiles` mapping. They are decorative
because the glass name remains visible as text.
On recipe details, the illustration sits beside the drink title rather than
inside the serving metadata table.
The glass selector also previews each profile when its option is hovered or
focused, with the selected glass illustrated when the selector first opens.
The illustration is available on both narrow and wide screens.

Card and detail glasses show explanatory ingredient color bands, in recipe order
from bottom to top. Band areas are proportional to original ml volumes, including
the taper of each glass's interior polygon. They do not depict physical layering,
glass capacity, or the finished drink's actual color. Non-ml measurements are
excluded from the bands without guessing volumes. The ingredient list serves
as the interactive key; there is no separate color legend.
Measurement toggles do not change the bands.
Every shared ingredient defines a six-digit hex `color` in `data/cocktails.json`.
Illustrations read these colors directly, with no generated
fallback palette. Colors are stylized approximations: clear spirits use pale
tints, whiskey uses amber, dairy uses ivory, and fruit and herbal liqueurs use
recognizable hues. Products that come in multiple colors use a representative
version (green crème de menthe, brown crème de cacao, and amber orange curaçao).
Hovering the recipe card or focusing it or its controls temporarily replaces the
right-hand copy with a large filled glass. Hovering an ingredient or focusing its
search link highlights its band; non-ml ingredients instead show an explanatory
caption. Leaving the card and moving focus outside restores the original copy.
The glass and copy crossfade over 220 ms without changing the column layout.
Hidden copy is excluded from keyboard navigation and assistive technology.
The transition is disabled when reduced motion is requested.

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

Flavor Notes supports multiple selections through tags and URLs. A recipe
matches only when it contains every selected note. Resetting the filters clears
these selections; no dedicated flavor-note selector is shown.

Selections are stored as repeated `flavor` query parameters, such as
`?flavor=citrus&flavor=fruity`. Existing links with a single `flavor` parameter
remain supported.
