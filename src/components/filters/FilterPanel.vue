<template>
  <section class="filter-panel" :aria-label="t('filter.title')">
    <RollBanner />

    <label class="search">
      <span class="sr-only">{{ t('filter.searchLabel') }}</span>
      <input v-model="state.search" type="search" :placeholder="t('filter.search')" />
    </label>

    <div class="status">
      <span aria-live="polite">{{ t('filter.count', { n: results.length }) }}</span>
      <button v-if="isFiltered" class="link-button" type="button" @click="resetFilters">{{ t('filter.reset') }}</button>
    </div>

    <SortControl v-if="collection.sorts.length" />

    <label v-if="collection.upgradeToggle" class="upgrade-toggle">
      <input v-model="upgraded" type="checkbox" />
      {{ t('filter.upgraded') }}
    </label>
    <label v-if="collection.upgradeToggle" class="upgrade-toggle">
      <input v-model="showOwnerAvatar" type="checkbox" />
      {{ t('filter.showOwner') }}
    </label>

    <button
      class="facets-toggle"
      type="button"
      :aria-expanded="facetsOpen"
      aria-controls="facets"
      @click="facetsOpen = !facetsOpen"
    >{{ t('filter.toggle') }}<span v-if="activeFacetCount" class="count">{{ activeFacetCount }}</span></button>

    <div id="facets" class="facets" :class="{ open: facetsOpen }">
      <template v-for="facet in collection.facets" :key="`${collection.key}-${facet.key}`">
        <PoolFilter v-if="facet.key === collection.poolBefore" />
        <FacetGroup :facet="facet" />
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { collection, currentState as state, isFiltered, resetFilters, results, showOwnerAvatar, t, upgraded } from '../../store/codex.js'
import FacetGroup from './FacetGroup.vue'
import PoolFilter from './PoolFilter.vue'
import RollBanner from './RollBanner.vue'
import SortControl from './SortControl.vue'

const facetsOpen = ref(false)
const activeFacetCount = computed(() => Object.values(state.value.facets).reduce((n, list) => n + list.length, 0))
</script>

<style scoped>
.filter-panel { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
.search input {
  width: 100%; padding: 9px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--surface-2); color: var(--text); font-size: 15px;
}
.status { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--text-dim); min-height: 20px; }
.upgrade-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.upgrade-toggle input { accent-color: var(--up); width: 16px; height: 16px; }
.facets { display: flex; flex-direction: column; gap: 14px; }
.facets-toggle { display: none; }
.count {
  display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 11px;
  background: var(--accent); color: var(--on-accent);
}

/* Phones: keep the results reachable; facets open on demand. */
@media (max-width: 720px) {
  .filter-panel { padding: 12px; gap: 10px; }
  .facets-toggle {
    display: block; padding: 8px; border: 1px solid var(--line); border-radius: 8px;
    background: var(--surface-2); color: var(--text); font-size: 14px; cursor: pointer;
  }
  .facets { display: none; }
  .facets.open { display: flex; }
}
</style>
