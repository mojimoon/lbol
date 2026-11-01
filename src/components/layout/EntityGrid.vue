<template>
  <section ref="wrap" class="entity-grid-wrap">
    <p v-if="results.length === 0" class="empty">{{ t('filter.none') }}</p>
    <ul v-else ref="grid" class="entity-grid" :class="collection.gridClass" :style="view.style">
      <li v-for="row in view.items" :key="row.id">
        <a
          class="tile-link"
          :class="{ selected: route.id === row.id }"
          :aria-current="route.id === row.id ? 'true' : undefined"
          :href="`#/${route.tab}/${encodeURIComponent(row.id)}`"
        >
          <component :is="tile" :entity="row" />
        </a>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useGridWindow } from '../../composables/gridWindow.js'
import { collection, results, route, t } from '../../store/codex.js'
import { ENTITY_COMPONENTS } from '../entities/registry.js'

const tile = computed(() => ENTITY_COMPONENTS[route.tab].tile)
const grid = ref(null)
const wrap = ref(null)
const { view, measure, tileBox } = useGridWindow(grid, results, computed(() => collection.value.tileAspect ?? null))

const indexOf = id => results.value.findIndex(row => row.id === id)
const MARGIN = 12

/**
 * Opening or closing the details changes the column count, which moves every tile. Keep the card
 * where it was on screen, or scroll it into view if it was not. With no card to follow (closing
 * after scrolling away), the first tile on screen holds the place instead.
 */
function holdPlace(id, previous) {
  const el = wrap.value
  // Phones: the document scrolls, the details are a sheet, and the columns never change.
  if (!el || !grid.value || getComputedStyle(el).overflowY === 'visible') return null
  const bounds = el.getBoundingClientRect()
  const onScreen = box => box && box.top < bounds.bottom && box.top + box.height > bounds.top
  const firstOnScreen = () => {
    const i = [...grid.value.children].findIndex(li => li.getBoundingClientRect().bottom > bounds.top)
    return i < 0 ? -1 : indexOf(view.value.items[i].id)
  }
  let index = indexOf(id)
  if (index < 0) {
    index = indexOf(previous)
    if (!onScreen(tileBox(index))) index = firstOnScreen()
  }
  if (index < 0) return null
  const before = tileBox(index)
  return { index, bounds, top: onScreen(before) ? before.top : null }
}

async function restorePlace(place) {
  if (!place) return
  // The new columns first need their list height, or the scroll below hits the old one's end.
  measure()
  await nextTick()
  const after = tileBox(place.index)
  if (!after) return
  const { bounds } = place
  const target = Math.max(bounds.top + MARGIN, Math.min(place.top ?? after.top, bounds.bottom - MARGIN - after.height))
  wrap.value.scrollBy(0, after.top - target)
  measure()
}

// Read the old layout the moment the route changes: a parent's re-render would replace it before
// any queued watcher here runs.
let place = null
watch(() => route.id, (id, previous) => { place = holdPlace(id, previous) }, { flush: 'sync' })
watch(() => route.id, () => restorePlace(place), { flush: 'post' })
// Arriving by a link to a card.
onMounted(async () => {
  await nextTick()
  if (route.id) restorePlace(holdPlace(route.id, null))
})
</script>

<style scoped>
.entity-grid-wrap { padding: 16px; }
.empty { padding: 48px 16px; text-align: center; color: var(--text-dim); }
.entity-grid { display: grid; gap: 12px; list-style: none; padding: 0; margin: 0; align-items: stretch; }
/* Scales with the window: about 5 columns on a desktop, 3 beside the detail panel. */
.grid-cards { grid-template-columns: repeat(auto-fill, minmax(max(165px, 14.2vw), 1fr)); }
.grid-exhibits { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.grid-characters { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.entity-grid > li { display: flex; min-width: 0; }
/* Rows are swapped for padding of the same height (useGridWindow): nothing for the browser to re-anchor. */
.grid-cards { overflow-anchor: none; }
/* Exhibits vary in height, so they all stay mounted; there are few, and the browser skips the off-screen ones. */
.grid-exhibits > li { content-visibility: auto; contain-intrinsic-size: auto 150px; }
.tile-link {
  display: block; width: 100%; color: inherit; text-decoration: none; border-radius: var(--radius); outline-offset: 2px;
}
.tile-link.selected { outline: 2px solid var(--accent); }
@media (max-width: 480px) {
  .entity-grid-wrap { padding: 12px; }
  .grid-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
}
</style>
