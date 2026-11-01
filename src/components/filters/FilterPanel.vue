<template>
  <section class="filter-panel" :aria-label="t('filter.title')">
    <RollBanner />

    <div class="bar">
      <label class="search">
        <span class="sr-only">{{ t('filter.searchLabel') }}</span>
        <input v-model="state.search" type="search" :placeholder="t('filter.search')" @keydown.enter="$event.target.blur()" />
      </label>
      <button
        class="facets-toggle"
        type="button"
        :aria-expanded="facetsOpen"
        aria-controls="facets"
        @click="facetsOpen = true"
      >{{ t('filter.toggle') }}<span v-if="activeFacetCount" class="count">{{ activeFacetCount }}</span></button>
    </div>

    <div class="status">
      <span aria-live="polite">{{ t('filter.count', { n: results.length }) }}</span>
      <button v-if="isFiltered" class="link-button" type="button" @click="resetFilters">{{ t('filter.reset') }}</button>
    </div>

    <div v-if="facetsOpen" class="sheet-backdrop" @click="facetsOpen = false"></div>
    <div id="facets" class="drawer" :class="{ 'sheet-open': facetsOpen }">
      <SheetHandle @close="facetsOpen = false" />

      <SortControl v-if="collection.sorts.length" />

      <label v-if="collection.upgradeToggle" class="upgrade-toggle">
        <input v-model="upgraded" type="checkbox" />
        {{ t('filter.upgraded') }}
      </label>
      <label v-if="collection.upgradeToggle" class="upgrade-toggle">
        <input v-model="showOwnerAvatar" type="checkbox" />
        {{ t('filter.showOwner') }}
      </label>

      <div class="facets">
        <template v-for="facet in collection.facets" :key="`${collection.key}-${facet.key}`">
          <PoolFilter v-if="facet.key === collection.poolBefore" />
          <FacetGroup :facet="facet" />
        </template>
      </div>

      <div class="drawer-actions">
        <button v-if="isFiltered" class="link-button" type="button" @click="resetFilters">{{ t('filter.reset') }}</button>
        <button class="show-results" type="button" @click="facetsOpen = false">{{ t('filter.count', { n: results.length }) }}</button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { collection, currentState as state, isFiltered, resetFilters, results, showOwnerAvatar, t, upgraded } from '../../store/codex.js'
import SheetHandle from '../shared/SheetHandle.vue'
import FacetGroup from './FacetGroup.vue'
import PoolFilter from './PoolFilter.vue'
import RollBanner from './RollBanner.vue'
import SortControl from './SortControl.vue'

const facetsOpen = ref(false)
// Phones: the preview's results are what the sheet would cover.
watch(() => state.value.poolDiff, kind => { if (kind) facetsOpen.value = false })
const activeFacetCount = computed(() =>
  Object.values(state.value.facets).reduce((n, list) => n + list.length, 0) + (state.value.pool?.enabled ? 1 : 0))
</script>

<style scoped>
.filter-panel { display: flex; flex-direction: column; gap: 7px; padding: 10px 12px; }
.search { display: block; flex: 1; min-width: 0; }
.search input {
  width: 100%; padding: 5px 10px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface-2); color: var(--text); font-size: 14px;
}
.status { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--text-dim); min-height: 16px; }
/* On wider screens the drawer is just part of this column. */
.drawer { display: contents; }
.drawer-actions, .facets-toggle { display: none; }
.upgrade-toggle { display: flex; align-items: center; gap: 6px; font-size: 13px; line-height: 1.3; cursor: pointer; }
.upgrade-toggle input { accent-color: var(--up); width: 16px; height: 16px; }
.facets { display: flex; flex-direction: column; gap: 7px; }
.count {
  display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 11px;
  background: var(--accent); color: var(--on-accent);
}

/* The way back stays in view while the pool inputs below are adjusted. */
@media (min-width: 721px) {
  .filter-panel .roll-banner {
    position: sticky; top: 0; z-index: 3;
    background: linear-gradient(var(--selected), var(--selected)), var(--bg);
  }
}

/* Phones: search stays in reach under the tabs (45px, see AppHeader); the rest is a bottom sheet. */
@media (max-width: 720px) {
  .filter-panel { display: contents; }
  .roll-banner { margin: 8px 12px 0; }
  .bar {
    position: sticky; top: 45px; z-index: 4; display: flex; gap: 8px; padding: 8px 12px;
    background: var(--bg); border-bottom: 1px solid var(--line);
  }
  .facets-toggle {
    display: block; flex: none; padding: 0 12px; border: 1px solid var(--line); border-radius: 6px;
    background: var(--surface-2); color: var(--text); font-size: 14px; cursor: pointer;
  }
  .status { padding: 6px 12px 0; }
  .drawer { display: none; }
  .drawer.sheet-open { display: flex; position: fixed; flex-direction: column; gap: 10px; padding: 0 16px; }
  /* The sheet scrolls; its rows must not squeeze to fit it. */
  .drawer.sheet-open > * { flex: none; }
  .upgrade-toggle { min-height: 28px; font-size: 14px; }
  .facets { gap: 10px; }
  .drawer-actions {
    display: flex; align-items: center; justify-content: flex-end; gap: 16px; position: sticky; bottom: 0; z-index: 1;
    margin: 0 -16px; padding: 10px 16px; background: var(--surface); border-top: 1px solid var(--line); font-size: 14px;
  }
  .show-results {
    padding: 9px 20px; border: 0; border-radius: 8px; background: var(--accent); color: var(--on-accent);
    font-size: 14px; font-weight: 600; cursor: pointer;
  }
}
</style>
