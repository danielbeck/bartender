import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import FilterSelect from './FilterSelect'
import FilterToggle from './FilterToggle'
import GlassProfile from './GlassProfile'
import { glassProfiles } from '../utils/glassProfiles'
import { ingredientVolumes } from '../utils/glassFill'
import FlavorFilters, { difficultyScales, strengthScales } from './FlavorFilters'
import { millilitersPerShot, recipeParts, recipeShots } from '../utils/recipeMeasurements'
import {
  cocktails, cocktailCategories, cocktailIdAliases, categoryLabel, filterCocktails,
  filterDefinitions, filterOptions, librarySearch, metadataLabel, readFilters, visibleSpirits,
} from '../utils/cocktails'
import './CocktailLibrary.scss'

const allFilterLabels = {
  category: 'All categories',
  spirit: 'All spirits',
  ingredient: 'Any nonalcoholic ingredients',
  glass: 'All glasses',
}

const carbonationStates = [
  { value: 'high', label: 'Yes' },
  { value: '', label: ' ' },
  { value: 'none', label: 'No' },
]

const temperatureStates = [
  { value: 'frozen', label: 'Frozen' },
  { value: '', label: ' ' },
  { value: 'hot', label: 'Hot' },
]

const filterGroups = [
  { label: 'Primary filters', keys: ['category', 'spirit', 'strength'] },
  { label: 'Additional filters', keys: ['glass', 'difficulty', 'carbonation', 'ingredient', 'temperature'] },
]

function MetadataTags({ title, values, filter, onShowResults }) {
  return <section className="cocktail-tags">
    <h2>{title}</h2>
    <div>{values.map((value) => <button type="button" key={value} onClick={() => onShowResults(filter, value)}>
      {filter === 'category' ? categoryLabel(value) : metadataLabel(value)}
    </button>)}</div>
  </section>
}

export default function CocktailLibrary() {
  const { cocktailId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const headingRef = useRef(null)
  const filterPanelId = useId()
  const [filtersOpen, setFiltersOpen] = useState(() => !window.matchMedia('(max-width: 720px)').matches)
  const [measurementUnit, setMeasurementUnit] = useState('ml')
  const [recipeHovered, setRecipeHovered] = useState(false)
  const [recipeFocused, setRecipeFocused] = useState(false)
  const [hoveredIngredient, setHoveredIngredient] = useState(null)
  const [focusedIngredient, setFocusedIngredient] = useState(null)
  const showGlassPreview = recipeHovered || recipeFocused
  const highlightedIngredient = hoveredIngredient ?? focusedIngredient
  const filters = readFilters(new URLSearchParams(location.search))
  const filteredCocktails = filterCocktails(filters)
  const selectedCocktailId = cocktailIdAliases[cocktailId] || cocktailId
  const selectedCocktail = cocktails.find((cocktail) => cocktail.libraryId === selectedCocktailId)
  const partsRecipe = selectedCocktail ? recipeParts(selectedCocktail.ingredients) : null
  const displayedAmounts = selectedCocktail
    ? measurementUnit === 'parts' ? partsRecipe.amounts
      : measurementUnit === 'shots' ? recipeShots(selectedCocktail.ingredients)
        : selectedCocktail.ingredients.map(({ amount }) => amount)
    : []
  const selectedCategory = cocktailCategories.find((category) => category.id === filters.category)
  const activeFilters = filterDefinitions.filter(({ key }) => Array.isArray(filters[key]) ? filters[key].length > 0 : filters[key]).length
  const activeFilterDescriptions = [
    ...(filters.q.trim() ? [`Search: ${filters.q.trim()}`] : []),
    ...filterDefinitions.flatMap(({ key, label }) => {
      const values = Array.isArray(filters[key]) ? filters[key] : filters[key] ? [filters[key]] : []
      return values.length
        ? [`${key === 'carbonation' ? 'Carbonated' : label}: ${values.map((value) =>
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
    window.scrollTo(0, 0)
    headingRef.current?.focus({ preventScroll: true })
  }, [cocktailId])

  const changeFilter = (key, value) => {
    navigate({ pathname: '/cocktails', search: librarySearch({ ...filters, [key]: value }, location.search) }, { replace: true })
  }
  const showResults = (key, value) => {
    navigate({ pathname: '/cocktails', search: librarySearch({ [key]: value }, location.search) })
  }
  const resetFilters = () => {
    navigate({ pathname: '/cocktails', search: librarySearch({}, location.search) }, { replace: true })
  }
  const listUrl = `/cocktails${location.search}`

  if (cocktailId && !selectedCocktail) {
    return <section className="cocktail-library">
      <h1 ref={headingRef} tabIndex={-1}>Cocktail not found</h1>
      <p>This cocktail is not in the library.</p>
      <Link className="library-button" to={listUrl}>Back to cocktail library</Link>
    </section>
  }

  return <section className="cocktail-library" aria-labelledby="cocktail-library-title">
    {selectedCocktail && <Link className="library-back" to={listUrl}>Back to cocktail library</Link>}
    <div className={selectedCocktail ? 'cocktail-detail-heading' : undefined}>
      <h1 id="cocktail-library-title" className={selectedCocktail ? 'cocktail-detail-title' : undefined} ref={headingRef} tabIndex={-1}>{selectedCocktail
        ? `${selectedCocktail.name}${selectedCocktail.variant ? ` (Recipe ${selectedCocktail.variant})` : ''}`
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
            to={`/cocktails${librarySearch({ q: ingredient.name }, location.search)}`}
          >{ingredient.name}</Link>
        </li>)}</ul>
        <h2>Garnish</h2>
        <p>{selectedCocktail.garnish.length ? selectedCocktail.garnish.join(', ') : 'No garnish'}</p>
        <dl className="cocktail-serving">
          <div><dt>Method</dt><dd>{metadataLabel(selectedCocktail.method)}</dd></div>
          <div><dt>Glass</dt><dd>{metadataLabel(selectedCocktail.glass)}</dd></div>
          <div><dt>Temperature</dt><dd>{metadataLabel(selectedCocktail.temperature)}</dd></div>
        </dl>
      </aside>
      <div className={`cocktail-preview-column${showGlassPreview ? ' is-illustrating' : ''}`}>
        <div className="cocktail-preview-copy" hidden={showGlassPreview}>
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
        {showGlassPreview && <div className="cocktail-large-glass">
          <GlassProfile
            glass={selectedCocktail.glass}
            ingredients={selectedCocktail.ingredients}
            highlightedIngredient={ingredientVolumes(selectedCocktail.ingredients).some(({ index }) => index === highlightedIngredient)
              ? highlightedIngredient : null}
          />
          <p>{highlightedIngredient !== null
            ? `${selectedCocktail.ingredients[highlightedIngredient].name}: ${displayedAmounts[highlightedIngredient]}${ingredientVolumes(selectedCocktail.ingredients).some(({ index }) => index === highlightedIngredient)
              ? '' : ' (not represented in the volume bands)'}`
            : ''}</p>
        </div>}
      </div>
    </div> : <>
      <p className="cocktail-library-intro">What would you like to drink?</p>
      <div className="cocktail-library-search">
        <div className="cocktail-search-row">
          <input type="search" value={filters.q} onChange={(event) => changeFilter('q', event.target.value)} placeholder="Search cocktails, ingredients, or flavors" aria-label="Search cocktail library" />
          <button
            type="button"
            className="cocktail-icon-button filter-toggle-button"
            aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
            title={filtersOpen ? 'Hide filters' : 'Show filters'}
            aria-expanded={filtersOpen}
            aria-controls={filterPanelId}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h6m4 0h6M4 17h10m4 0h2" />
              <circle cx="12" cy="7" r="2" />
              <circle cx="16" cy="17" r="2" />
            </svg>
          </button>
        </div>
        <div
          className={`cocktail-filter-panel${filtersOpen ? ' is-open' : ''}`}
          id={filterPanelId}
          inert={filtersOpen ? undefined : ''}
          aria-hidden={!filtersOpen}
        >
          <div className="cocktail-filter-panel-content">
            {filterGroups.map(({ label: groupLabel, keys }) => <div className="cocktail-filters" role="group" aria-label={groupLabel} key={groupLabel}>
              {keys.map((key) => key === 'strength'
                ? <FlavorFilters key={key} label="Strength" scales={strengthScales} filters={filters} onChange={changeFilter} />
                : key === 'difficulty'
                  ? <FlavorFilters key={key} label="Difficulty" scales={difficultyScales} filters={filters} onChange={changeFilter} />
                  : key === 'carbonation'
                    ? <FilterToggle
                      key={key}
                      label="Carbonated"
                      value={filters[key]}
                      states={carbonationStates}
                      onChange={(value) => changeFilter(key, value)}
                    />
                    : key === 'temperature'
                      ? <FilterToggle
                        key={key}
                        label="Temperature"
                        value={filters[key]}
                        states={temperatureStates}
                        valueWidth="6ch"
                        onChange={(value) => changeFilter(key, value)}
                      />
                      : <FilterSelect
                        key={key}
                        label={filterDefinitions.find((definition) => definition.key === key).label}
                        value={filters[key]}
                        multiple={['spirit', 'ingredient'].includes(key)}
                        renderPreview={key === 'glass' ? (glass) => <div className="glass-selector-illustration">
                          {glassProfiles[glass] && <GlassProfile glass={glass} />}
                          <span>{!glass ? 'All glasses' : glassProfiles[glass] ? metadataLabel(glass) : `Unknown: ${glass}`}</span>
                        </div> : undefined}
                        options={[
                          { value: '', label: key === 'spirit' ? 'Any spirits' : allFilterLabels[key] },
                          ...(Array.isArray(filters[key]) ? filters[key] : [filters[key]])
                            .filter((value) => value && !filterOptions[key].some((option) => option.value === value))
                            .map((value) => ({ value, label: `Unknown: ${value}` })),
                          ...filterOptions[key],
                        ]}
                        onChange={(value) => changeFilter(key, value)}
                      />)}
              {groupLabel === 'Additional filters' && activeFilterDescriptions.length > 0 && <div className="filter-reset-summary">
                <button type="button" className="library-button" aria-label={resetFiltersLabel} title={resetFiltersLabel} onClick={resetFilters}>
                  Reset filters
                </button>
                <p>{activeFilterDescriptions.length
                  ? `${activeFilterDescriptions.join('; ')}`
                  : ''}</p>
              </div>}
            </div>)}
          </div>
        </div>
        <div className="cocktail-results-toolbar">
          <p role="status">{filteredCocktails.length} {filteredCocktails.length === 1 ? 'cocktail' : 'cocktails'}</p>
        </div>
      </div>
      {selectedCategory && <header className="cocktail-results-category">
        <h2>{selectedCategory.name}</h2>
        <p>{selectedCategory.description}</p>
      </header>}
      {filteredCocktails.length ? <div className="cocktail-results">{filteredCocktails.map((cocktail) => <Link
        className="cocktail-result"
        key={cocktail.libraryId}
        to={`/cocktails/${encodeURIComponent(cocktail.libraryId)}${location.search}`}
      >
        <div className="cocktail-result-heading">
          <h2>{cocktail.name}{cocktail.variant ? ` (Recipe ${cocktail.variant})` : ''}</h2>
          <GlassProfile glass={cocktail.glass} ingredients={cocktail.ingredients} />
        </div>
        <p className="cocktail-result-meta">{cocktail.baseSpirits.map(metadataLabel).join(' / ')} · {metadataLabel(cocktail.strength)}</p>
        <p>{cocktail.categories.map(categoryLabel).join(' / ')}</p>
        <p>{metadataLabel(cocktail.glass)} · {metadataLabel(cocktail.difficulty)}</p>
      </Link>)}</div> : <div className="cocktail-empty">
        <h2>No cocktails match your filters</h2>
        <p>Try a different search or reset the filters to see the full library.</p>
        {activeFilterDescriptions.length > 0 && <button type="button" className="library-button" onClick={resetFilters}>Reset filters</button>}
      </div>}
    </>}
  </section>
}
