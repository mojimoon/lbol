import { nextTick, onBeforeUnmount, onMounted, unref, watch } from 'vue'

/**
 * Shrink an element's font until its text fits, as the game's auto-sizing card text does.
 * A ResizeObserver covers both window changes and off-screen tiles getting their first
 * layout (content-visibility), so cards are only measured once they are about to show.
 *
 * target: ref to an element or component. source: getter for the text being displayed.
 */
export function useFitText(target, source, { max, min, step = 0.25 }) {
  const element = () => {
    const value = unref(target)
    return value?.$el ?? value
  }
  const overflows = el => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1

  function fit() {
    const el = element()
    if (!el?.clientHeight) return
    let low = 0
    let high = Math.round((max - min) / step)
    // Largest size that fits; `min` is used even if it still overflows (the text can scroll).
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      el.style.fontSize = `${min + mid * step}px`
      if (overflows(el)) high = mid - 1
      else low = mid
    }
    el.style.fontSize = `${min + low * step}px`
  }

  let observer
  onMounted(() => {
    observer = new ResizeObserver(fit)
    observer.observe(element())
  })
  onBeforeUnmount(() => observer?.disconnect())
  watch(source, () => nextTick(fit))
}
