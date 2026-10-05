import { useId } from 'react'
import { glassHandles, glassProfiles } from '../utils/glassProfiles'
import { glassFill } from '../utils/glassFill'

export default function GlassProfile({ glass, ingredients = [], highlightedIngredient = null, className = '' }) {
  const clipId = `glass-fill-${useId().replace(/:/g, '')}`
  const profile = glassProfiles[glass]
  if (!profile) throw new Error(`Unknown glass profile: ${glass}`)
  const { interior, bands } = glassFill(glass, ingredients)

  return <svg
    className={`glass-profile ${className}`}
    viewBox="0 0 64 96"
    width="64"
    height="96"
    aria-hidden="true"
    focusable="false"
  >
    {bands.length > 0 && <>
      <defs>
        <clipPath id={clipId}>
          <polygon points={interior.map((point) => point.join(',')).join(' ')} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {bands.map(({ index, y, height, color }) => <rect
          key={index}
          x="0"
          y={y}
          width="64"
          height={height}
          fill={color}
          opacity={highlightedIngredient === null || highlightedIngredient === index ? 1 : 0.25}
          stroke={highlightedIngredient === index ? 'currentColor' : 'none'}
          strokeWidth="1"
        />)}
      </g>
    </>}
    <path
      d={profile}
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {glassHandles[glass] && <path
      d={glassHandles[glass]}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />}
  </svg>
}
