import { Fragment, useId, useRef, useState } from 'react'
import useFilterPopup from './useFilterPopup'
import styles from './FilterSelect.module.scss'

export default function FilterSelect({ label, value, options, onChange, renderPreview, multiple = false }) {
    const id = useId()
    const { rootRef, triggerRef, panelRef, isOpen, setIsOpen, close: closePopup, position } = useFilterPopup()
    const optionRefs = useRef([])
    const [activeIndex, setActiveIndex] = useState(0)
    const [hoveredValue, setHoveredValue] = useState(undefined)
    const selectedValues = multiple ? value : []
    const isSelected = (optionValue) => multiple
        ? optionValue === '' ? selectedValues.length === 0 : selectedValues.includes(optionValue)
        : optionValue === value
    const selectedIndex = options.findIndex((option) => isSelected(option.value))
    const previewOption = options.find((option) => option.value === (hoveredValue ?? value)) || options[0]

    const close = () => {
        closePopup()
        setHoveredValue(undefined)
    }

    const selectOption = (optionValue) => {
        if (multiple) {
            onChange(optionValue === '' ? [] : selectedValues.includes(optionValue)
                ? selectedValues.filter((selected) => selected !== optionValue)
                : [...selectedValues, optionValue])
        } else {
            onChange(optionValue)
            close()
            triggerRef.current?.focus()
        }
    }

    const open = (focusIndex) => {
        const index = focusIndex ?? (selectedIndex >= 0 ? selectedIndex : 0)
        setActiveIndex(index)
        setHoveredValue(undefined)
        setIsOpen(true)
        if (focusIndex !== undefined) {
            requestAnimationFrame(() => optionRefs.current[index]?.focus())
        }
    }

    const moveActive = (index) => {
        const nextIndex = (index + options.length) % options.length
        setActiveIndex(nextIndex)
        optionRefs.current[nextIndex]?.focus()
    }

    const handleTriggerKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (isOpen) {
                moveActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1))
            } else {
                open(selectedIndex >= 0 ? selectedIndex : 0)
            }
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (isOpen) close()
            else open()
        }
    }

    const handleOptionKeyDown = (event, index) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            moveActive(index + (event.key === 'ArrowDown' ? 1 : -1))
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            moveActive(event.key === 'Home' ? 0 : options.length - 1)
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            selectOption(options[index].value)
        } else if (event.key === 'Tab') {
            close()
        }
    }

    return (
        <div className={styles.select} ref={rootRef}>
            <button
                className={styles.trigger}
                id={`${id}-trigger`}
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-label={label}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={`${id}-listbox`}
                aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
                onClick={() => (isOpen ? close() : open())}
                onKeyDown={handleTriggerKeyDown}
            >
                <span className={styles.value}>{multiple
                    ? `${label}${selectedValues.length ? ` (${selectedValues.length})` : ''}`
                    : options[selectedIndex >= 0 ? selectedIndex : 0]?.label}</span>
                <span className={styles.caret} aria-hidden="true" />
            </button>
            <div
                className={`${styles.panel} ${renderPreview ? styles.withPreview : ''}`}
                ref={panelRef}
                hidden={!isOpen}
                style={{ left: position?.left ?? -10000, top: position?.top ?? -10000 }}
            >
                <div
                    className={styles.options}
                    id={`${id}-listbox`}
                    role="listbox"
                    aria-label={label}
                    aria-multiselectable={multiple || undefined}
                >
                    {options.map((option, index) => (
                        <Fragment key={option.value}>
                            {option.group && options[index - 1]?.group !== option.group && <div className={styles.groupHeading} role="presentation">{option.group}</div>}
                            <button
                                className={`${styles.option} ${isSelected(option.value) ? styles.selected : ''} ${index === activeIndex ? styles.active : ''}`}
                                id={`${id}-option-${index}`}
                                ref={(element) => { optionRefs.current[index] = element }}
                                type="button"
                                role="option"
                                aria-selected={isSelected(option.value)}
                                tabIndex={-1}
                                onClick={() => selectOption(option.value)}
                                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                                onMouseEnter={() => setHoveredValue(option.value)}
                                onMouseLeave={() => setHoveredValue(undefined)}
                            >
                                {multiple && <span className={styles.checkmark} aria-hidden="true">{isSelected(option.value) ? '\u2713' : ''}</span>}
                                {option.label}
                            </button>
                        </Fragment>
                    ))}
                </div>
                {renderPreview && <div className={styles.preview} aria-label={`${label} preview`}>
                    {renderPreview(previewOption.value)}
                </div>}
            </div>
        </div>
    )
}
