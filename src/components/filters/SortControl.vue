<template>
  <div class="sort-control">
    <label for="sort-select">{{ t('sort.label') }}</label>
    <select id="sort-select" v-model="state.sort">
      <option v-for="s in collection.sorts" :key="s.key" :value="s.key">{{ t(s.label) }}</option>
    </select>
    <button
      type="button"
      class="direction"
      :aria-label="t(state.descending ? 'sort.desc' : 'sort.asc')"
      :title="t(state.descending ? 'sort.desc' : 'sort.asc')"
      @click="state.descending = !state.descending"
    >{{ state.descending ? '↓' : '↑' }}</button>
  </div>
</template>

<script setup>
import { collection, currentState as state, t } from '../../store/codex.js'
</script>

<style scoped>
.sort-control { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.sort-control label { color: var(--text-dim); font-size: 13px; }
select {
  flex: 1; min-width: 0; padding: 3px 6px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface-2); color: var(--text); font-size: 14px;
}
.direction {
  width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface-2); color: var(--text); cursor: pointer; font-size: 15px;
}
.direction:hover { background: var(--hover); }
</style>
