export default function FilterToggle({ label, value, states, onChange, valueWidth = '3ch', disabled = false }) {
  const index = states.findIndex((state) => state.value === value)
  const stateLabel = states[index]?.label ?? `Unknown: ${value}`
  const accessibleLabel = states[index] && !stateLabel.trim() ? 'any' : stateLabel

  return <button
    className="filter-three-toggle"
    type="button"
    disabled={disabled}
    aria-label={`${label}: ${accessibleLabel}. Change filter`}
    onClick={() => onChange(states[(index + 1) % states.length].value)}
  >
    <span>{label}:</span>
    <span className="filter-three-toggle-state" style={{ gridTemplateColumns: `46px ${valueWidth}` }} aria-hidden="true">
      <span className="filter-three-toggle-track" data-position={index >= 0 ? states.length === 2 ? index * 2 : index : 1} />
      {stateLabel}
    </span>
  </button>
}
