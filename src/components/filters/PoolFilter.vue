<template>
  <details class="pool-filter" :open="startOpen">
    <summary>{{ t('pool.title') }}<span v-if="pool.enabled" class="on-mark" aria-hidden="true"></span></summary>

    <label class="check">
      <input v-model="pool.enabled" type="checkbox" />
      {{ t('pool.enable') }}
    </label>

    <div class="group">
      <div class="group-label">{{ t('pool.mana') }}</div>
      <div class="mana-grid">
        <label v-for="color in COLORS" :key="color" class="mana-input">
          <ManaIcon :symbol="color" size="22px" />
          <span class="sr-only">{{ t('pool.manaCount', { color: t(`mana.${color}`) }) }}</span>
          <input
            type="number" min="0" max="99" inputmode="numeric"
            :value="pool.mana[color]"
            @input="setMana(color, $event.target.value)"
          />
        </label>
      </div>
    </div>

    <div class="group">
      <div class="group-label">{{ t('pool.owners') }}</div>
      <div class="chips" role="group" :aria-label="t('pool.owners')">
        <button
          v-for="c in data.characters" :key="c.id" type="button" class="chip"
          :class="{ on: pool.owners.includes(c.id) }" :aria-pressed="pool.owners.includes(c.id)"
          @click="toggleOwner(c.id)"
        >
          <img class="avatar" :src="imgUrl('characters', c.avatar)" alt="" loading="lazy" />
          {{ c.shortName }}
        </button>
      </div>
    </div>

    <label v-if="blankExhibit" class="check">
      <input v-model="pool.blank" type="checkbox" @change="pool.enabled = true" />
      <img class="exhibit-icon" :src="imgUrl('icons', blankExhibit.img)" alt="" />
      {{ blankExhibit.name }}
    </label>

    <p class="hint">{{ t('pool.hint') }}</p>
  </details>
</template>

<script setup>
import { computed } from 'vue'
import { currentState, data, findEntity, imgUrl, t } from '../../store/codex.js'
import ManaIcon from '../shared/ManaIcon.vue'

const COLORS = ['W', 'U', 'B', 'R', 'G', 'C', 'P']
const pool = computed(() => currentState.value.pool)
const blankExhibit = computed(() => findEntity('exhibits', 'KongbaiKapai'))
// Only the initial state: unticking the filter must not collapse the panel under the cursor.
const startOpen = pool.value.enabled

function setMana(color, raw) {
  const value = Number.parseInt(raw, 10)
  pool.value.mana[color] = Number.isNaN(value) ? 0 : Math.max(0, value)
  pool.value.enabled = true
}
function toggleOwner(id) {
  const list = pool.value.owners
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
  pool.value.enabled = true
}
</script>

<style scoped>
summary { font-size: 13px; color: var(--text-dim); cursor: pointer; margin-bottom: 8px; }
.on-mark { display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: var(--accent); }
.check { display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; margin-bottom: 10px; }
.check input { accent-color: var(--accent); width: 16px; height: 16px; flex: none; }
.group { margin-bottom: 10px; }
.group-label { font-size: 12.5px; color: var(--text-dim); margin-bottom: 5px; }
.mana-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 5px; }
.mana-input { display: flex; align-items: center; gap: 3px; }
.mana-input input {
  width: 100%; min-width: 0; padding: 4px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface-2); color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums;
}
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 3px 10px; font-size: 13px;
  border: 1px solid var(--line); border-radius: 15px; background: transparent; color: var(--text); cursor: pointer;
}
.chip:hover { background: var(--hover); }
.chip.on { border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent); }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; object-position: top; margin-left: -5px; }
.exhibit-icon { width: 24px; height: 24px; object-fit: contain; }
.hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-dim); }
</style>
