<template>
  <section class="entity-grid-wrap">
    <p v-if="results.length === 0" class="empty">{{ t('filter.none') }}</p>
    <ul v-else class="entity-grid" :class="collection.gridClass">
      <li v-for="row in results" :key="row.id">
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
import { computed } from 'vue'
import { collection, results, route, t } from '../../store/codex.js'
import { ENTITY_COMPONENTS } from '../entities/registry.js'

const tile = computed(() => ENTITY_COMPONENTS[route.tab].tile)
</script>

<style scoped>
.entity-grid-wrap { padding: 16px; }
.empty { padding: 48px 16px; text-align: center; color: var(--text-dim); }
.entity-grid { display: grid; gap: 12px; list-style: none; padding: 0; margin: 0; align-items: stretch; }
/* Scales with the window: about 5 columns on a desktop, 3 beside the detail panel. */
.grid-cards { grid-template-columns: repeat(auto-fill, minmax(max(165px, 14.2vw), 1fr)); }
.grid-exhibits { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.grid-characters { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.entity-grid > li {
  display: flex; min-width: 0;
  /* Skip rendering off-screen tiles: hundreds of cards scroll smoothly without a virtual list. */
  content-visibility: auto; contain-intrinsic-size: auto 300px;
}
.tile-link {
  display: block; width: 100%; color: inherit; text-decoration: none; border-radius: var(--radius); outline-offset: 2px;
}
.tile-link.selected { outline: 2px solid var(--accent); }
@media (max-width: 480px) {
  .entity-grid-wrap { padding: 12px; }
  .grid-cards { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 8px; }
}
</style>
