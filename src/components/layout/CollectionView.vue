<template>
  <main v-if="route.tab === 'characters'" class="characters"><CharacterView /></main>
  <main v-else class="collection" :class="{ 'has-filters': hasFilters, 'has-detail': selected }">
    <FilterPanel v-if="hasFilters" class="col-filters" />
    <EntityGrid class="col-grid" />
    <div v-if="selected" class="sheet-backdrop" @click="navigate(route.tab)"></div>
    <DetailPane v-if="selected" class="col-detail sheet-open" />
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { collection, navigate, route, selected } from '../../store/codex.js'
import CharacterView from '../entities/CharacterView.vue'
import DetailPane from './DetailPane.vue'
import EntityGrid from './EntityGrid.vue'
import FilterPanel from '../filters/FilterPanel.vue'

const hasFilters = computed(() => collection.value.facets.length > 0)
</script>

<style scoped>
.characters { flex: 1; min-height: 0; overflow-y: auto; }
.collection {
  --filters-w: 300px; --detail-w: 420px;
  display: grid; grid-template-columns: minmax(0, 1fr); min-height: 0; flex: 1;
}
.collection.has-filters { grid-template-columns: var(--filters-w) minmax(0, 1fr); }
.collection.has-detail { grid-template-columns: minmax(0, 1fr) var(--detail-w); }
.collection.has-filters.has-detail { grid-template-columns: var(--filters-w) minmax(0, 1fr) var(--detail-w); }
/* position: absolute children (.sr-only) must scroll with their column, not stretch the page. */
.col-filters, .col-grid, .col-detail { position: relative; overflow-y: auto; min-height: 0; }
.col-filters { border-right: 1px solid var(--line); }
.col-detail { border-left: 1px solid var(--line); background: var(--surface); }

@media (max-width: 1280px) {
  .collection { --filters-w: 260px; --detail-w: 380px; }
}
/* Too narrow for three columns: detail becomes an overlay. */
@media (min-width: 721px) and (max-width: 1080px) {
  .collection.has-detail { grid-template-columns: minmax(0, 1fr); }
  .collection.has-filters.has-detail { grid-template-columns: var(--filters-w) minmax(0, 1fr); }
  .col-detail {
    position: fixed; inset: 0 0 0 auto; width: 420px; z-index: 20; box-shadow: var(--shadow);
  }
}
/* Phones: the page scrolls as a whole and the details rise from the bottom (.sheet-open in app.css). */
@media (max-width: 720px) {
  .characters { overflow: visible; }
  .collection, .collection.has-filters, .collection.has-filters.has-detail { display: block; }
  .col-grid { overflow: visible; }
  .col-filters { display: contents; }
  .col-detail { position: fixed; border-left: 0; }
}
</style>
