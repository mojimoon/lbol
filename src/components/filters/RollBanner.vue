<template>
  <div v-if="source || diffTitle" class="roll-banner" role="status">
    <p v-if="source" class="title">{{ t('roll.active', { name: source.name }) }}</p>
    <RichText v-else class="title" :tokens="diffTitle" />
    <p v-if="source && !source.roll.unlimited" class="note">{{ t('roll.runNote') }}</p>
    <div class="actions">
      <button v-if="rollReturn" type="button" class="action primary" @click="returnFromRoll">{{ t('roll.back') }}</button>
      <button type="button" class="action" @click="clearRoll">{{ t('roll.clear') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import RichText from '../shared/RichText.vue'
import { MANA_ORDER } from '../../config/collections.js'
import { clearRoll, currentState, findEntity, poolBaseline, poolStart, returnFromRoll, rollReturn, t } from '../../store/codex.js'

const source = computed(() => (currentState.value.roll ? findEntity('cards', currentState.value.roll) : null))
const diffTitle = computed(() => {
  const { poolDiff, pool } = currentState.value
  if (!poolDiff || !poolStart.value) return null
  // e.g. 琪露诺(mana icons): who the compared pool belongs to, and its base mana.
  const route = poolBaseline.value ? poolBaseline.value.route : pool.route
  const character = findEntity('characters', route?.split('.')[0])
  const mana = MANA_ORDER.flatMap(c => Array(poolStart.value.mana[c]).fill({ m: c }))
  const [before, after] = t(poolDiff === 'added' ? 'pool.previewAdded' : 'pool.previewRemoved').split('{name}')
  return [before, `${character?.shortName ?? ''}(`, ...mana, ')', after]
})
</script>

<style scoped>
.roll-banner { padding: 10px 12px; border-radius: 8px; border: 1px solid var(--accent); background: var(--selected); }
.title { margin: 0; font-size: 14px; font-weight: 600; }
.note { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--text-dim); }
.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.action {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); background: transparent;
  color: var(--text); font-size: 13px; cursor: pointer;
}
.action:hover { background: var(--hover); }
.action.primary { border-color: var(--accent); color: var(--accent); }
</style>
