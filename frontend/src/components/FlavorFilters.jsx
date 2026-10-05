import { useEffect, useId } from 'react'
import { filterLabel } from '../utils/cocktails'
import useFilterPopup from './FilterSelect/useFilterPopup'
import styles from './FilterSelect/FilterSelect.module.scss'

export default function FlavorFilters({ filters, onChange, label, scales }) {
  const id = useId()
  const { rootRef, triggerRef, panelRef, isOpen, setIsOpen, close, position } = useFilterPopup()
  const activeCount = scales.filter(({ key }) => filters[key]).length

  useEffect(() => {
    if (isOpen) panelRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [isOpen, panelRef])

  return <div
    className={`${styles.select} ${styles.compact}`}
    ref={rootRef}
    onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close()
    }}
  >
    <button
      className={styles.trigger}
      ref={triggerRef}
      id={`${id}-trigger`}
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls={`${id}-panel`}
      onClick={() => setIsOpen((current) => !current)}
    >
      <span className={styles.value}>{label}{activeCount ? ` (${activeCount})` : ''}</span>
      <span className={styles.caret} aria-hidden="true" />
    </button>
    <div
      className={`${styles.panel} ${styles.flavorPanel}`}
      ref={panelRef}
      id={`${id}-panel`}
      role="dialog"
      aria-labelledby={`${id}-trigger`}
      hidden={!isOpen}
      style={{ left: position?.left ?? -10000, top: position?.top ?? -10000 }}
    >
    <div className="flavor-sliders">
      {scales.map(({ key, label, levels }) => {
        const values = ['', ...levels]
        const index = values.indexOf(filters[key])
        const valueLabel = !filters[key] ? 'any'
          : index < 0 ? `Unknown: ${filters[key]}` : filterLabel(key, filters[key])

        return <div className={`flavor-slider${!filters[key] ? ' is-unfiltered' : ''}`} key={key}>
          <label className={styles.groupHeading} htmlFor={`${id}-${key}`}>{label}</label>
          <div className="flavor-slider-control">
            <span className="flavor-slider-value">{valueLabel}</span>
            <input
              id={`${id}-${key}`}
              type="range"
              min={0}
              max={values.length - 1}
              step={1}
              value={Math.max(0, index)}
              aria-valuetext={valueLabel}
              onChange={(event) => onChange(key, values[Number(event.target.value)])}
            />
          </div>
        </div>
      })}
    </div>
    </div>
  </div>
}
