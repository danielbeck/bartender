import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import FilterToggle from './FilterToggle'
import { barIngredientGroups } from '../utils/barStock'

export default function YourBar({ bar, user }) {
  const headingId = useId()
  const [guestStockOnly, setGuestStockOnly] = useState(false)
  const stockedIds = new Set(bar.ingredientIds || [])
  const ready = Boolean(user && bar.ingredientIds)

  return <section className="your-bar" aria-labelledby={headingId} aria-busy={bar.loading || bar.saving}>
    <h2 id={headingId}>The Bar.</h2>
    {user && !ready && !bar.error && <p role="status">Loading Your Bar...</p>}
    {user && bar.error && <p role="alert">
      {ready ? 'Your changes were not saved. ' : 'Could not load Your Bar. '}{bar.error}
      {!ready && <> <button type="button" className="library-button" onClick={bar.retry}>Retry</button></>}
    </p>}
    <FilterToggle
      label="Show"
      value={user ? Boolean(bar.stockOnly) : guestStockOnly}
      states={[
        { value: false, label: 'all the drinks' },
        { value: true, label: 'only what I have in stock' },
      ]}
      valueWidth="19ch"
      disabled={Boolean(user && (!ready || bar.saving))}
      onChange={(stockOnly) => {
        if (!user) {
          setGuestStockOnly(stockOnly)
          return
        }
        bar.save({ stockOnly })
      }}
    />
    {!user && guestStockOnly && <p className="your-bar-auth-prompt">
      <Link to="/auth?mode=login">Log in</Link> or <Link to="/auth?mode=register">create an account</Link> to show only the drinks you can make with what you have in stock right now.
    </p>}
    {ready && !bar.error && <p className="your-bar-save-status" role="status">{bar.saving ? 'Saving Your Bar...' : ''}</p>}
    {bar.stockOnly && ready && <>
      <p>We'll remember the list of ingredients you tell us you have on hand.  Water, ice, plain sugars, and salt/pepper are assumed available; garnishes and optional ingredients are not required.</p>
      {barIngredientGroups.map((section) => <section key={section.id} aria-labelledby={`${headingId}-${section.id}`}>
        <h3 id={`${headingId}-${section.id}`}>{section.label}</h3>
        <div className="your-bar-groups">{section.groups.map((group) => <fieldset key={group.id} disabled={bar.saving}>
          <legend>{group.label}</legend>
          <button
            type="button"
            className="library-button"
            aria-label={`${group.ingredients.every(({ id }) => stockedIds.has(id)) ? 'Select none' : 'Select all'} in ${group.label}`}
            onClick={() => {
              const nextIds = new Set(stockedIds)
              const allSelected = group.ingredients.every(({ id }) => stockedIds.has(id))
              for (const { id } of group.ingredients) {
                if (allSelected) nextIds.delete(id)
                else nextIds.add(id)
              }
              bar.save({ ingredientIds: [...nextIds] })
            }}
          >{group.ingredients.every(({ id }) => stockedIds.has(id)) ? 'Select none' : 'Select all'}</button>
          {group.ingredients.map(({ id, name }) => <label key={id}>
            <input type="checkbox" checked={stockedIds.has(id)} onChange={(event) => bar.save({
              ingredientIds: event.target.checked
                ? [...stockedIds, id] : [...stockedIds].filter((value) => value !== id),
            })} />
            {name}
          </label>)}
        </fieldset>)}</div>
      </section>)}
    </>}
  </section>
}
