<template>
  <main class="collection" :class="{ 'has-filters': hasFilters, 'has-detail': selected }">
    <FilterPanel v-if="hasFilters" class="col-filters" />
    <EntityGrid class="col-grid" />
    <DetailPane v-if="selected" class="col-detail" />
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { collection, selected } from '../../store/codex.js'
import DetailPane from './DetailPane.vue'
import EntityGrid from './EntityGrid.vue'
import FilterPanel from '../filters/FilterPanel.vue'

const hasFilters = computed(() => collection.value.facets.length > 0)
</script>

<style scoped>
.collection {
  --filters-w: 300px; --detail-w: 420px;
  display: grid; grid-template-columns: minmax(0, 1fr); min-height: 0; flex: 1;
}
.collection.has-filters { grid-template-columns: var(--filters-w) minmax(0, 1fr); }
.collection.has-detail { grid-template-columns: minmax(0, 1fr) var(--detail-w); }
.collection.has-filters.has-detail { grid-template-columns: var(--filters-w) minmax(0, 1fr) var(--detail-w); }
.col-filters, .col-grid, .col-detail { overflow-y: auto; min-height: 0; }
.col-filters { border-right: 1px solid var(--line); }
.col-detail { border-left: 1px solid var(--line); background: var(--surface); }

@media (max-width: 1280px) {
  .collection { --filters-w: 260px; --detail-w: 380px; }
}
/* Too narrow for three columns: detail becomes an overlay. */
@media (max-width: 1080px) {
  .collection.has-detail { grid-template-columns: minmax(0, 1fr); }
  .collection.has-filters.has-detail { grid-template-columns: var(--filters-w) minmax(0, 1fr); }
  .col-detail {
    position: fixed; inset: 0 0 0 auto; width: min(420px, 100vw); z-index: 20; box-shadow: var(--shadow);
  }
}
@media (max-width: 720px) {
  .collection, .collection.has-filters, .collection.has-filters.has-detail { display: block; overflow-y: auto; }
  .col-filters, .col-grid { overflow: visible; }
  .col-filters { border-right: 0; border-bottom: 1px solid var(--line); }
}
</style>
