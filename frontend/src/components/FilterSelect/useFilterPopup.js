import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function useFilterPopup() {
    const rootRef = useRef(null)
    const triggerRef = useRef(null)
    const panelRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)
    const [position, setPosition] = useState(null)
    const close = useCallback(() => setIsOpen(false), [])

    useEffect(() => {
        if (!isOpen) return undefined

        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) close()
        }
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                close()
                triggerRef.current?.focus()
            }
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [isOpen, close])

    useLayoutEffect(() => {
        if (!isOpen) return undefined

        const updatePosition = () => {
            const trigger = triggerRef.current?.getBoundingClientRect()
            const panel = panelRef.current?.getBoundingClientRect()
            if (!trigger || !panel) return

            const left = Math.max(12, Math.min(trigger.left, window.innerWidth - panel.width - 12))
            const below = trigger.bottom + 6
            const top = below + panel.height <= window.innerHeight - 12
                ? below
                : Math.max(12, trigger.top - panel.height - 6)
            setPosition({ left, top })
        }

        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen])

    return { rootRef, triggerRef, panelRef, isOpen, setIsOpen, close, position }
}
