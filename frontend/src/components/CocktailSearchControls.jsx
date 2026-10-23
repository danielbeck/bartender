import { useId, useState } from 'react'
import FilterSelect from './FilterSelect'
import FilterToggle from './FilterToggle'
import FlavorFilters from './FlavorFilters'
import GlassProfile from './GlassProfile'
import { glassProfiles } from '../utils/glassProfiles'
import { filterGroups, filterOptions, filterScale, metadataLabel } from '../utils/cocktails'

export default function CocktailSearchControls({ filters, onChange }) {
  const panelId = useId()
  const [open, setOpen] = useState(() => !window.matchMedia('(max-width: 720px)').matches)

  return <>
    <div className="cocktail-search-row">
      <input type="search" value={filters.q} onChange={(event) => onChange('q', event.target.value)} placeholder="Search cocktails, ingredients, or flavors" aria-label="Search cocktail library" />
      <button
        type="button"
        className="cocktail-icon-button filter-toggle-button"
        aria-label={open ? 'Hide filters' : 'Show filters'}
        title={open ? 'Hide filters' : 'Show filters'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h6m4 0h6M4 17h10m4 0h2" />
          <circle cx="12" cy="7" r="2" />
          <circle cx="16" cy="17" r="2" />
        </svg>
      </button>
    </div>
    <div className={`cocktail-filter-panel${open ? ' is-open' : ''}`} id={panelId} inert={open ? undefined : ''} aria-hidden={!open}>
      <div className="cocktail-filter-panel-content">
        {filterGroups.map(({ id, label: groupLabel, definitions }) => <div className="cocktail-filters" role="group" aria-label={groupLabel} key={id}>
          {definitions.map((definition) => {
            const { key, label, controlLabel, control, multiple, states, emptyLabel, illustration } = definition
            return control === 'slider'
              ? <FlavorFilters key={key} label={controlLabel || label} scales={definition.scales || [filterScale(definition)]} filters={filters} onChange={onChange} />
              : control === 'toggle'
                ? <FilterToggle
                  key={key}
                  label={controlLabel || label}
                  value={filters[key]}
                  states={states}
                  valueWidth={`${Math.max(3, ...states.map(({ label }) => label.length))}ch`}
                  onChange={(value) => onChange(key, value)}
                />
                : <FilterSelect
                  key={key}
                  label={label}
                  value={filters[key]}
                  multiple={multiple}
                  renderPreview={illustration === 'glass' ? (glass) => <div className="glass-selector-illustration">
                    {glassProfiles[glass] && <GlassProfile glass={glass} />}
                    <span>{!glass ? emptyLabel : glassProfiles[glass] ? metadataLabel(glass) : `Unknown: ${glass}`}</span>
                  </div> : undefined}
                  options={[
                    { value: '', label: emptyLabel },
                    ...(Array.isArray(filters[key]) ? filters[key] : [filters[key]])
                      .filter((value) => value && !filterOptions[key].some((option) => option.value === value))
                      .map((value) => ({ value, label: `Unknown: ${value}` })),
                    ...filterOptions[key],
                  ]}
                  onChange={(value) => onChange(key, value)}
                />
          })}
        </div>)}
      </div>
    </div>
  </>
}
