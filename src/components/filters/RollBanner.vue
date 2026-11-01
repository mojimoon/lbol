<template>
  <div v-if="source || diffTitle" class="roll-banner" role="status">
    <p class="title">{{ source ? t('roll.active', { name: source.name }) : diffTitle }}</p>
    <p v-if="source && !source.roll.unlimited" class="note">{{ t('roll.runNote') }}</p>
    <div class="actions">
      <button v-if="rollReturn" type="button" class="action primary" @click="returnFromRoll">{{ t('roll.back') }}</button>
      <button type="button" class="action" @click="clearRoll">{{ t('roll.clear') }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { clearRoll, currentState, findEntity, returnFromRoll, rollReturn, t } from '../../store/codex.js'

const source = computed(() => (currentState.value.roll ? findEntity('cards', currentState.value.roll) : null))
const diffTitle = computed(() => {
  const { poolDiff, pool } = currentState.value
  if (!poolDiff) return null
  const [id, side] = pool.route?.split('.') ?? []
  const character = findEntity('characters', id)
  if (!character) return null
  const color = character.colors[side === 'B' ? 1 : 0]
  const name = `${character.shortName} (${t(`mana.${color}`)})`
  return t(poolDiff === 'added' ? 'pool.previewAdded' : 'pool.previewRemoved', { name })
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
