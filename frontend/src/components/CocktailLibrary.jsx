import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import CocktailSearchControls from './CocktailSearchControls'
import FilterToggle from './FilterToggle'
import GlassProfile from './GlassProfile'
import { ingredientVolumes } from '../utils/glassFill'
import YourBar from './YourBar'
import useBarStock from '../utils/useBarStock'
import { canMakeCocktail, isIngredientAvailable } from '../utils/barStock'
import { millilitersPerShot, recipeParts, recipeShots } from '../utils/recipeMeasurements'
import {
  cocktails, cocktailIdAliases, categoryLabel, filterCocktails, groupCocktailsByCategory,
  filterDefinitions, filterOptions, ingredientFilters, librarySearch, metadataLabel, readFilters, visibleSpirits,
} from '../utils/cocktails'
import './CocktailLibrary.scss'

function MetadataTags({ title, values, filter, onShowResults }) {
  return <section className="cocktail-tags">
    <h2>{title}</h2>
    <div>{values.map((value) => <button type="button" key={value} onClick={() => onShowResults(filter, value)}>
      {filter === 'category' ? categoryLabel(value) : metadataLabel(value)}
    </button>)}</div>
  </section>
}

function LaboratoryCard({ to }) {
  return <Link className="cocktail-result laboratory-result" to={to}>
    <svg className="laboratory-result-illustration" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 9h34l-4 15c-1.5 5.5-6.5 9-13 9s-11.5-3.5-13-9L10 9Zm17 24v13m-9 4h18" />
      <circle cx="48" cy="18" r="12" />
      <path d="M46 15a2.5 2.5 0 1 1 4.3 1.8c-1.1 1-2.3 1.3-2.3 3.2m.1 3.8v.1" />
    </svg>
    <h3>Invent a drink</h3>
    <p>Take your search to The Laboratory.</p>
  </Link>
}

export default function CocktailLibrary({ user }) {
  const { cocktailId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const headingRef = useRef(null)
  const searchStartRef = useRef(null)
  const scrollToSearchRef = useRef(false)
  const [measurementUnit, setMeasurementUnit] = useState('ml')
  const [sortByCategory, setSortByCategory] = useState(true)
  const [recipeHovered, setRecipeHovered] = useState(false)
  const [recipeFocused, setRecipeFocused] = useState(false)
  const [hoveredIngredient, setHoveredIngredient] = useState(null)
  const [focusedIngredient, setFocusedIngredient] = useState(null)
  const showGlassPreview = recipeHovered || recipeFocused
  const highlightedIngredient = hoveredIngredient ?? focusedIngredient
  const filters = readFilters(new URLSearchParams(location.search))
  const bar = useBarStock(user)
  const stockOnly = Boolean(user && bar.stockOnly)
  const stockedIds = new Set(bar.ingredientIds || [])
  const filteredCocktails = filterCocktails(filters)
    .filter((cocktail) => !stockOnly || canMakeCocktail(cocktail, stockedIds))
  const selectedCocktailId = cocktailIdAliases[cocktailId] || cocktailId
  const selectedCocktail = cocktails.find((cocktail) => cocktail.libraryId === selectedCocktailId)
  const missingIngredientIds = new Set(user && bar.ingredientIds && !stockOnly && selectedCocktail
    ? selectedCocktail.ingredients.filter((ingredient) => !isIngredientAvailable(ingredient, stockedIds))
      .map(({ ingredientId }) => ingredientId)
    : [])
  const partsRecipe = selectedCocktail ? recipeParts(selectedCocktail.ingredients) : null
  const displayedAmounts = selectedCocktail
    ? measurementUnit === 'parts' ? partsRecipe.amounts
      : measurementUnit === 'shots' ? recipeShots(selectedCocktail.ingredients)
        : selectedCocktail.ingredients.map(({ amount }) => amount)
    : []
  const resultCategories = sortByCategory
    ? groupCocktailsByCategory(filteredCocktails)
    : [{ id: 'all', cocktails: filteredCocktails }]
  const activeFilters = filterDefinitions.filter(({ key }) => Array.isArray(filters[key]) ? filters[key].length > 0 : filters[key]).length
  const activeFilterDescriptions = [
    ...(filters.q.trim() ? [`Search: ${filters.q.trim()}`] : []),
    ...filterDefinitions.flatMap(({ key, label, controlLabel }) => {
      const values = Array.isArray(filters[key]) ? filters[key] : filters[key] ? [filters[key]] : []
      return values.length
        ? [`${controlLabel || label}: ${values.map((value) =>
          filterOptions[key].find((option) => option.value === value)?.label
          || (key === 'category' ? categoryLabel(value) : metadataLabel(value))).join(', ')}`]
        : []
    }),
  ]
  const resetFiltersLabel = activeFilterDescriptions.length
    ? `Reset filters. ${activeFilterDescriptions.join('; ')}`
    : 'Reset filters. '

  useEffect(() => {
    setRecipeHovered(false)
    setRecipeFocused(false)
    setHoveredIngredient(null)
    setFocusedIngredient(null)
    headingRef.current?.scrollIntoView({ block: 'start' })
    headingRef.current?.focus({ preventScroll: true })
  }, [cocktailId])

  useLayoutEffect(() => {
    if (!scrollToSearchRef.current) return
    scrollToSearchRef.current = false
    if (searchStartRef.current) {
      window.scrollTo({
        top: window.scrollY + searchStartRef.current.getBoundingClientRect().top,
        behavior: 'instant',
      })
    }
  }, [location.search])

  const updateSearchFilters = (values) => {
    const search = librarySearch(values, location.search)
    if (search === location.search) return
    scrollToSearchRef.current = true
    navigate({ pathname: '/cocktails', search }, { replace: true })
  }
  const changeFilter = (key, value) => {
    updateSearchFilters({ ...filters, [key]: value })
  }
  const showResults = (key, value) => {
    navigate({ pathname: '/cocktails', search: librarySearch({ [key]: value }, location.search) })
  }
  const resetFilters = () => {
    updateSearchFilters({})
  }
  const listUrl = `/cocktails${location.search}`
  const laboratoryUrl = `/laboratory${location.search}`

  if (cocktailId && !selectedCocktail) {
    return <section className="cocktail-library">
      <h1 ref={headingRef} tabIndex={-1}>Cocktail not found</h1>
      <p>This cocktail is not in the library.</p>
      <Link className="library-button" to={listUrl}>Back to cocktail library</Link>
    </section>
  }

  return <section className="cocktail-library" aria-labelledby="cocktail-library-title">
    {!cocktailId && <YourBar bar={bar} user={user} />}
    {selectedCocktail && <Link className="library-back" to={listUrl}>Back to the cocktails</Link>}
    <div className={selectedCocktail ? 'cocktail-detail-heading' : undefined}>
      <h1 id="cocktail-library-title" className={selectedCocktail ? 'cocktail-detail-title' : undefined} ref={headingRef} tabIndex={-1}>The {selectedCocktail
        ? `${selectedCocktail.name}${selectedCocktail.variant ? ` (Recipe ${selectedCocktail.variant})` : '.'}`
        : 'Cocktails.'}</h1>
      {selectedCocktail && <GlassProfile glass={selectedCocktail.glass} ingredients={selectedCocktail.ingredients} />}
    </div>
    {selectedCocktail ? <div className="cocktail-preview">
      <aside
        className="cocktail-recipe"
        tabIndex={0}
        aria-label="Recipe ingredients"
        onMouseEnter={() => setRecipeHovered(true)}
        onMouseLeave={() => {
          setRecipeHovered(false)
          setHoveredIngredient(null)
        }}
        onFocus={() => setRecipeFocused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setRecipeFocused(false)
            setFocusedIngredient(null)
          }
        }}
      >
        <div className="recipe-measurements">
          <h2>Ingredients</h2>
          <div className="recipe-unit-toggle" role="group" aria-label="Recipe measurements">
            {['ml', 'parts', 'shots'].map((unit) => <button
              key={unit}
              type="button"
              className="library-button"
              aria-label={`Display ingredient amounts in ${unit}`}
              aria-pressed={measurementUnit === unit}
              disabled={unit !== 'ml' && !partsRecipe.millilitersPerPart}
              onClick={() => setMeasurementUnit(unit)}
            >{unit}</button>)}
          </div>
        </div>
        {measurementUnit === 'parts' && partsRecipe.millilitersPerPart && <p className="recipe-part-size">
          1 part = {partsRecipe.millilitersPerPart} ml.
        </p>}
        <ul>{selectedCocktail.ingredients.map((ingredient, index) => <li
          key={`${ingredient.name}-${index}`}
          onMouseEnter={() => setHoveredIngredient(index)}
          onMouseLeave={() => setHoveredIngredient(null)}
          onFocus={() => setFocusedIngredient(index)}
          onBlur={() => setFocusedIngredient(null)}
        >
          <span className="ingredient-amount">{displayedAmounts[index]}</span>
          <Link
            className="ingredient-search-link"
            to={`/cocktails${librarySearch(ingredientFilters(ingredient), location.search)}`}
          >{ingredient.name}{missingIngredientIds.has(ingredient.ingredientId) && <>
            <span aria-hidden="true">*</span>
            <span className="cocktail-visually-hidden"> (not in stock)</span>
          </>}</Link>
        </li>)}</ul>
        {missingIngredientIds.size > 0 && <p>* You'll need to stock these to make this drink.</p>}
        <h2>Garnish</h2>
        <p>{selectedCocktail.garnish.length ? selectedCocktail.garnish.join(', ') : 'No garnish'}</p>
        <dl className="cocktail-serving">
          <div><dt>Method</dt><dd>{metadataLabel(selectedCocktail.method)}</dd></div>
          <div><dt>Glass</dt><dd>{metadataLabel(selectedCocktail.glass)}</dd></div>
          <div><dt>Temperature</dt><dd>{metadataLabel(selectedCocktail.temperature)}</dd></div>
        </dl>
      </aside>
      <div className={`cocktail-preview-column${showGlassPreview ? ' is-illustrating' : ''}`}>
        <div className="cocktail-preview-copy" aria-hidden={showGlassPreview} inert={showGlassPreview ? '' : undefined}>
          <p className="cocktail-summary">
            {selectedCocktail.baseSpirits.map(metadataLabel).join(' / ')} · {metadataLabel(selectedCocktail.strength)} · {metadataLabel(selectedCocktail.difficulty)}
          </p>
          {selectedCocktail.description && <p className="cocktail-description">{selectedCocktail.description}</p>}
          {selectedCocktail.mixingInstructions && <section className="cocktail-instructions">
            <h2>Mixing instructions</h2>
            <p>{selectedCocktail.mixingInstructions}</p>
          </section>}
          <MetadataTags title="Categories" values={selectedCocktail.categories} filter="category" onShowResults={showResults} />
          <MetadataTags title="Spirits" values={visibleSpirits(selectedCocktail.spirits)} filter="spirit" onShowResults={showResults} />
          <MetadataTags title="Method" values={[selectedCocktail.method]} filter="method" onShowResults={showResults} />
          <MetadataTags title="Flavor Notes" values={selectedCocktail.flavorProfile} filter="flavor" onShowResults={showResults} />
          <h2>Characteristics</h2>
          <dl className="cocktail-facts">{filterDefinitions.filter(({ key }) => !['category', 'spirit', 'flavor', 'ingredient', 'method'].includes(key)).map(({ key, field, label }) => <div key={key}>
            <dt>{label}</dt><dd><button type="button" onClick={() => showResults(key, selectedCocktail[field])}>{metadataLabel(selectedCocktail[field])}</button></dd>
          </div>)}</dl>
        </div>
        <div className="cocktail-large-glass" aria-hidden={!showGlassPreview}>
          <GlassProfile
            glass={selectedCocktail.glass}
            ingredients={selectedCocktail.ingredients}
            highlightedIngredient={ingredientVolumes(selectedCocktail.ingredients).some(({ index }) => index === highlightedIngredient)
              ? highlightedIngredient : null}
          />
          <p>{highlightedIngredient !== null
            ? `${selectedCocktail.ingredients[highlightedIngredient].name}: ${displayedAmounts[highlightedIngredient]}`
            : ''}</p>
        </div>
      </div>
    </div> : <>
      <p className="cocktail-library-intro">What would you like to drink?</p>
      <div ref={searchStartRef} aria-hidden="true" />
      <div className="cocktail-library-search">
        <CocktailSearchControls filters={filters} onChange={changeFilter} />
        <div className="cocktail-results-toolbar">
          <p role="status">{filteredCocktails.length} {filteredCocktails.length === 1 ? 'cocktail' : 'cocktails'}</p>
          {activeFilterDescriptions.length > 0 && <p className="cocktail-active-filters">{activeFilterDescriptions.join('; ')}</p>}
          {activeFilterDescriptions.length > 0 && <button type="button" className="library-button" aria-label={resetFiltersLabel} title={resetFiltersLabel} onClick={resetFilters}>
            Reset filters
          </button>}
          <FilterToggle
            label="Sort by category"
            value={sortByCategory}
            states={[{ value: false, label: 'off' }, { value: true, label: 'on' }]}
            onChange={setSortByCategory}
          />
        </div>
      </div>
      {filteredCocktails.length ? resultCategories.map((category) => <section key={category.id} aria-labelledby={sortByCategory ? `category-${category.id}` : undefined}>
        {sortByCategory && <header className="cocktail-results-category">
          <h2 id={`category-${category.id}`}>{category.name}</h2>
          <p>{category.description}</p>
        </header>}
        <div className="cocktail-results">{category.cocktails.map((cocktail) => <Link
          className="cocktail-result"
          key={cocktail.libraryId}
          to={`/cocktails/${encodeURIComponent(cocktail.libraryId)}${location.search}`}
        >
          <div className="cocktail-result-heading">
            <h3>{cocktail.name}{cocktail.variant ? ` (Recipe ${cocktail.variant})` : ''}</h3>
            <GlassProfile glass={cocktail.glass} ingredients={cocktail.ingredients} />
          </div>
          <p className="cocktail-result-meta">{cocktail.baseSpirits.map(metadataLabel).join(' / ')} · {metadataLabel(cocktail.strength)}</p>
          <p>{cocktail.categories.map(categoryLabel).join(' / ')}</p>
          <p>{metadataLabel(cocktail.glass)} · {metadataLabel(cocktail.difficulty)}</p>
        </Link>)}
          <LaboratoryCard to={sortByCategory
            ? `/laboratory${librarySearch({ ...filters, category: category.id }, location.search)}`
            : laboratoryUrl} />
        </div>
      </section>) : <div className="cocktail-empty">
        <h2>No cocktails match your filters</h2>
        <p>{stockOnly
          ? 'Check more ingredients in Your Bar or choose "Show all the drinks". You can also adjust your search filters.'
          : 'Try a different search or reset the filters to see the full library.'}</p>
        {activeFilterDescriptions.length > 0 && <button type="button" className="library-button" onClick={resetFilters}>Reset filters</button>}
        <LaboratoryCard to={laboratoryUrl} />
      </div>}
    </>}
  </section>
}
