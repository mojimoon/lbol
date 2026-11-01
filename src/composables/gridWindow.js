import { computed, onBeforeUnmount, onMounted, ref, shallowRef, unref, watch } from 'vue'

/**
 * Rows [first, last) to render: what is on screen plus one screen each way.
 * top: the grid's top edge relative to the viewport (negative once scrolled past).
 */
export function visibleRows(top, viewport, rowHeight, totalRows) {
  const first = Math.min(totalRows, Math.max(0, Math.floor((-top - viewport) / rowHeight)))
  const last = Math.min(totalRows, Math.max(first, Math.ceil((-top + 2 * viewport) / rowHeight)))
  return [first, last]
}

/**
 * Virtual scrolling for a CSS grid whose tiles all have the same shape: renders only the rows
 * near the viewport, with padding standing in for the rest. Measures against the viewport, so it
 * works whichever ancestor scrolls (the column on desktop, the document on phones).
 *
 * rows: ref to the full list. aspect: ref to the tile's height / width, or null to render everything.
 */
export function useGridWindow(grid, rows, aspect) {
  const metrics = shallowRef(null)

  function currentLayout() {
    const style = getComputedStyle(grid.value)
    const tracks = style.gridTemplateColumns.split(' ')
    const gap = parseFloat(style.rowGap) || 0
    const rowHeight = parseFloat(tracks[0]) * unref(aspect) + gap
    return { columns: tracks.length, rowHeight, gap, top: grid.value.getBoundingClientRect().top }
  }

  /** Where a tile of the full list is on screen, whether it is rendered right now or not. */
  function tileBox(index) {
    if (!grid.value || index < 0) return null
    if (!unref(aspect)) return grid.value.children[index]?.getBoundingClientRect() ?? null
    const { columns, rowHeight, gap, top } = currentLayout()
    return { top: top + Math.floor(index / columns) * rowHeight, height: rowHeight - gap }
  }

  function measure() {
    if (!grid.value || !unref(aspect)) return
    const { columns, rowHeight, top } = currentLayout()
    if (!rowHeight) return
    const next = { columns, rowHeight, top, viewport: innerHeight }
    // Scrolling within the same rows should not re-render the list.
    const old = metrics.value
    if (old && old.columns === next.columns && old.rowHeight === next.rowHeight && old.viewport === next.viewport
      && sameRows(old, next)) return
    metrics.value = next
  }
  const rangeOf = m => visibleRows(m.top, m.viewport, m.rowHeight, Math.ceil(unref(rows).length / m.columns))
  const sameRows = (a, b) => rangeOf(a).join() === rangeOf(b).join()

  const view = computed(() => {
    const list = unref(rows)
    const m = metrics.value
    if (!unref(aspect) || !m) return { items: list, style: null }
    const [first, last] = rangeOf(m)
    const totalRows = Math.ceil(list.length / m.columns)
    return {
      items: list.slice(first * m.columns, last * m.columns),
      style: {
        paddingTop: `${first * m.rowHeight}px`,
        paddingBottom: `${(totalRows - last) * m.rowHeight}px`,
      },
    }
  })

  const scrollOptions = { capture: true, passive: true }
  let observer
  onMounted(() => {
    measure()
    window.addEventListener('scroll', measure, scrollOptions)
    // Window resizes and the detail column opening: both change the column width.
    observer = new ResizeObserver(measure)
    watch(grid, (el, old) => {
      if (old) observer.unobserve(old)
      if (el) observer.observe(el)
    }, { immediate: true, flush: 'post' })
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', measure, scrollOptions)
    observer?.disconnect()
  })
  // After the new height has clamped the scroll position, and still before this frame paints.
  watch([rows, () => unref(aspect)], () => {
    if (!unref(aspect)) metrics.value = null
    measure()
  }, { flush: 'post' })

  return { view, measure, tileBox }
}
