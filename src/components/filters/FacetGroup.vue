<template>
  <component :is="facet.collapsible ? 'details' : 'div'" class="facet" :open="facet.collapsible ? activeCount > 0 : undefined">
    <component :is="facet.collapsible ? 'summary' : 'div'" class="facet-label">
      {{ t(facet.label) }}<span v-if="activeCount" class="count">{{ activeCount }}</span>
    </component>
    <div class="chips" role="group" :aria-label="t(facet.label)">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="chip"
        :class="{ on: active.includes(opt.value), 'icon-only': opt.mana }"
        :aria-pressed="active.includes(opt.value)"
        :title="opt.label"
        @click="toggleFacet(facet.key, opt.value)"
      >
        <ManaIcon v-if="opt.mana" :symbol="opt.mana" :label="opt.label" size="22px" />
        <img v-else-if="opt.avatar" class="avatar" :src="imgUrl('characters', opt.avatar)" alt="" loading="lazy" />
        <span v-if="!opt.mana">{{ opt.label }}</span>
      </button>
    </div>
    <p v-if="facet.hint" class="hint">{{ t(facet.hint) }}</p>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { currentState, data, imgUrl, t, toggleFacet } from '../../store/codex.js'
import ManaIcon from '../shared/ManaIcon.vue'

const props = defineProps({ facet: { type: Object, required: true } })
const options = computed(() => props.facet.options(data.value, t))
const active = computed(() => currentState.value.facets[props.facet.key])
const activeCount = computed(() => active.value.length)
</script>

<style scoped>
.facet-label { font-size: 13px; color: var(--text-dim); margin-bottom: 6px; display: block; }
summary.facet-label { display: list-item; cursor: pointer; }
.count {
  display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 11px;
  background: var(--accent); color: var(--on-accent);
}
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px; min-height: 30px; padding: 3px 10px;
  border: 1px solid var(--line); border-radius: 15px; background: transparent; color: var(--text);
  font-size: 13px; cursor: pointer;
}
.chip:hover { background: var(--hover); }
.chip.on { border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent); }
.chip.icon-only { padding: 3px; width: 32px; height: 32px; border-radius: 50%; justify-content: center; }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; object-position: top; margin-left: -5px; }
.hint { margin: 6px 0 0; font-size: 12px; color: var(--text-dim); line-height: 1.5; }
</style>
