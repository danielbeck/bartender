import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { runLLMCall } from '../api'
import InventedRecipe from './InventedRecipe'
import CocktailSearchControls from './CocktailSearchControls'
import { glassProfiles } from '../utils/glassProfiles'
import {
  categoryLabel, filterDefinitions, filterOptions, librarySearch, metadataLabel, readFilters,
} from '../utils/cocktails'
import './CocktailLibrary.scss'

export default function Laboratory() {
  const location = useLocation()
  const navigate = useNavigate()
  const pendingRequest = useRef(null)
  const [result, setResult] = useState(null)
  const filters = readFilters(new URLSearchParams(location.search))
  const criteria = filterDefinitions.flatMap(({ key, label, controlLabel }) => {
    const values = Array.isArray(filters[key]) ? filters[key] : filters[key] ? [filters[key]] : []
    return values.length ? [{
      key,
      label: controlLabel || label,
      value: values.map((value) =>
        filterOptions[key].find((option) => option.value === value)?.label
        || (key === 'category' ? categoryLabel(value) : metadataLabel(value))).join(', '),
    }] : []
  })
  const draftInput = JSON.stringify({
    search: filters.q,
    filters: criteria.map(({ label, value }) => ({ label, value })),
  })
  const [request, setRequest] = useState(() => ({ input: draftInput, attempt: 0 }))
  const { input, attempt } = request
  const updateFilters = (values) => {
    navigate({ pathname: '/laboratory', search: librarySearch(values, location.search) }, { replace: true })
  }
  const generateDrink = () => {
    setRequest((previous) => ({ input: draftInput, attempt: previous.attempt + 1 }))
  }

  useEffect(() => {
    let active = true
    // Reuse the in-flight request when StrictMode replays this effect.
    if (pendingRequest.current?.input !== input || pendingRequest.current?.attempt !== attempt) {
      pendingRequest.current = { input, attempt, promise: runLLMCall('invent_drink', input) }
    }
    pendingRequest.current.promise.then(
      (data) => {
        if (!active) return
        const recipe = data.data
        if (!recipe || typeof recipe.title !== 'string' || !recipe.title.trim()
          || typeof recipe.description !== 'string' || !recipe.description.trim()
          || typeof recipe.mixingInstructions !== 'string' || !recipe.mixingInstructions.trim()
          || typeof recipe.glass !== 'string' || !Object.hasOwn(glassProfiles, recipe.glass)
          || !Array.isArray(recipe.ingredients) || !recipe.ingredients.length
          || !recipe.ingredients.some((ingredient) => /^\d+(?:\.\d+)? ml$/.test(ingredient?.quantity)
            && Number.parseFloat(ingredient.quantity) > 0)
          || recipe.ingredients.some((ingredient) => !ingredient
            || typeof ingredient.name !== 'string' || !ingredient.name.trim()
            || typeof ingredient.quantity !== 'string' || !ingredient.quantity.trim()
            || typeof ingredient.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(ingredient.color))) {
          setResult({ input, attempt, error: 'The LLM returned an invalid drink. Please try again.' })
          return
        }
        setResult({ input, attempt, recipe })
      },
      (error) => {
        if (active) setResult({ input, attempt, error: error.message })
      },
    )
    return () => { active = false }
  }, [input, attempt])

  const currentResult = result?.input === input && result?.attempt === attempt ? result : null

  return <section className="cocktail-library" aria-labelledby="laboratory-title">
    <Link className="library-back" to={`/cocktails${location.search}`}>Back to the cocktails</Link>
    <h1 id="laboratory-title">The Laboratory.</h1>
    <p>These drinks don't exist.  Try them anyway. Who knows, it might work out.</p>
    <form className="cocktail-library-search" onSubmit={(event) => { event.preventDefault(); generateDrink() }}>
      <CocktailSearchControls filters={filters} onChange={(key, value) => updateFilters({ ...filters, [key]: value })} />
      <div className="cocktail-results-toolbar">
        {(filters.q.trim() || criteria.length > 0) && <button type="button" className="library-button" onClick={() => updateFilters({})}>
          Reset filters
        </button>}
        <button
          type="submit"
          className={`library-button laboratory-generate-button${draftInput !== input ? ' needs-regeneration' : ''}`}
          disabled={!currentResult}
        >Generate drink</button>
      </div>
    </form>
    <section aria-labelledby="laboratory-result-title" aria-busy={!currentResult}>
      <h2 id="laboratory-result-title">Your invention</h2>
      {!currentResult ? <p role="status">Concocting a drink...</p>
        : currentResult.error ? <>
          <p role="alert">{currentResult.error}</p>
          <button type="button" className="library-button" onClick={generateDrink}>
            Try again
          </button>
        </> : <InventedRecipe
          key={`${input}-${attempt}`}
          recipe={currentResult.recipe}
        />}
    </section>
  </section>
}
