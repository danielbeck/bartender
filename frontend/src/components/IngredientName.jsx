import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ingredientDescription } from '../utils/cocktails'

export default function IngredientName({ ingredient, to, children }) {
  const id = useId()
  const description = ingredientDescription(ingredient)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const visible = Boolean(description && (hovered || focused) && !dismissed)

  useEffect(() => {
    if (!visible) return
    const dismiss = (event) => {
      if (event.key === 'Escape') setDismissed(true)
    }
    document.addEventListener('keydown', dismiss)
    return () => document.removeEventListener('keydown', dismiss)
  }, [visible])

  const triggerProps = {
    'aria-describedby': visible ? id : undefined,
    onFocus: () => { setFocused(true); setDismissed(false) },
    onBlur: () => setFocused(false),
  }

  return <span
    className="ingredient-name"
    onMouseEnter={() => { setHovered(true); setDismissed(false) }}
    onMouseLeave={() => setHovered(false)}
  >
    {to ? <Link {...triggerProps} className="ingredient-search-link" to={to}>{children}</Link>
      : <span {...triggerProps} tabIndex={description ? 0 : undefined}>{children}</span>}
    {visible && <span id={id} role="tooltip" className="ingredient-tooltip">{description}</span>}
  </span>
}
