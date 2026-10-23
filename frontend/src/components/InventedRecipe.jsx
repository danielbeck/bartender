import { useState } from 'react'
import GlassProfile from './GlassProfile'
import { ingredientVolumes } from '../utils/glassFill'
import { metadataLabel } from '../utils/cocktails'
import { recipeParts, recipeShots } from '../utils/recipeMeasurements'

export default function InventedRecipe({ recipe }) {
  const [unit, setUnit] = useState('ml')
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hoveredIngredient, setHoveredIngredient] = useState(null)
  const [focusedIngredient, setFocusedIngredient] = useState(null)
  const ingredients = recipe.ingredients.map(({ quantity, ...ingredient }) => ({ ...ingredient, amount: quantity }))
  const parts = recipeParts(ingredients)
  const amounts = unit === 'parts' ? parts.amounts
    : unit === 'shots' ? recipeShots(ingredients) : ingredients.map(({ amount }) => amount)
  const highlighted = hoveredIngredient ?? focusedIngredient
  const illustrating = hovered || focused

  return <article>
    <div className="cocktail-detail-heading">
      <h2 className="cocktail-detail-title">The {recipe.title}.</h2>
      <GlassProfile glass={recipe.glass} ingredients={ingredients} />
    </div>
    <div className="cocktail-preview">
      <aside
        className="cocktail-recipe"
        tabIndex={0}
        aria-label="Recipe ingredients for one serving"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setHoveredIngredient(null) }}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocused(false)
            setFocusedIngredient(null)
          }
        }}
      >
        <div className="recipe-measurements">
          <h2>Ingredients</h2>
          <div className="recipe-unit-toggle" role="group" aria-label="Recipe measurements">
            {['ml', 'parts', 'shots'].map((value) => <button
              key={value}
              type="button"
              className="library-button"
              aria-label={`Display ingredient amounts in ${value}`}
              aria-pressed={unit === value}
              onClick={() => setUnit(value)}
            >{value}</button>)}
          </div>
        </div>
        <p>One serving</p>
        {unit === 'parts' && <p className="recipe-part-size">1 part = {parts.millilitersPerPart} ml.</p>}
        <ul>{ingredients.map((ingredient, index) => <li
          key={index}
          onMouseEnter={() => setHoveredIngredient(index)}
          onMouseLeave={() => setHoveredIngredient(null)}
          onFocus={() => setFocusedIngredient(index)}
          onBlur={() => setFocusedIngredient(null)}
        >
          <span className="ingredient-amount">{amounts[index]}</span>
          <span>
            {ingredient.name}
          </span>
        </li>)}</ul>
        {unit === 'parts' && parts.rounded && <p>These proportions are approximate.</p>}
        <dl className="cocktail-serving"><div><dt>Glass</dt><dd>{metadataLabel(recipe.glass)}</dd></div></dl>
      </aside>
      <div className={`cocktail-preview-column${illustrating ? ' is-illustrating' : ''}`}>
        <div className="cocktail-preview-copy" aria-hidden={illustrating} inert={illustrating ? '' : undefined}>
          <p className="cocktail-description laboratory-response">{recipe.description}</p>
          <section className="cocktail-instructions">
            <h2>Mixing instructions</h2>
            <p>{recipe.mixingInstructions}</p>
          </section>
        </div>
        <div className="cocktail-large-glass" aria-hidden={!illustrating}>
          <GlassProfile
            glass={recipe.glass}
            ingredients={ingredients}
            highlightedIngredient={ingredientVolumes(ingredients).some(({ index }) => index === highlighted) ? highlighted : null}
          />
          <p>{highlighted !== null ? `${ingredients[highlighted].name}: ${amounts[highlighted]}` : ''}</p>
        </div>
      </div>
    </div>
  </article>
}
