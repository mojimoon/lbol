<template>
  <component :is="facet.collapsible ? 'details' : 'div'" class="facet" :open="facet.collapsible ? startOpen : undefined">
    <component :is="facet.collapsible ? 'summary' : 'div'" class="facet-label">
      {{ t(facet.label) }}<HintIcon v-if="facet.hint" :text="t(facet.hint)" /><span v-if="activeCount" class="count">{{ activeCount }}</span>
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
        <ManaIcon v-if="opt.mana" :symbol="opt.mana" :label="opt.label" size="20px" />
        <img v-else-if="opt.avatar" class="avatar" :src="imgUrl('characters', opt.avatar)" alt="" loading="lazy" />
        <img v-else-if="opt.icon" class="icon" :src="imgUrl('card-ui', opt.icon)" alt="" loading="lazy" />
        <span v-if="!opt.mana">{{ opt.label }}</span>
      </button>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { currentState, data, imgUrl, t, toggleFacet } from '../../store/codex.js'
import HintIcon from '../shared/HintIcon.vue'
import ManaIcon from '../shared/ManaIcon.vue'

const props = defineProps({ facet: { type: Object, required: true } })
const options = computed(() => props.facet.options(data.value, t))
const active = computed(() => currentState.value.facets[props.facet.key])
const activeCount = computed(() => active.value.length)
// Only the initial state: clearing the last chip must not collapse the group under the cursor.
const startOpen = activeCount.value > 0
</script>

<style scoped>
.facet-label { font-size: 12.5px; line-height: 1.3; color: var(--text-dim); margin-bottom: 3px; display: block; }
summary.facet-label { display: list-item; cursor: pointer; }
.count {
  display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 11px;
  background: var(--accent); color: var(--on-accent);
}
.chips { display: flex; flex-wrap: wrap; gap: 3px 4px; }
.chip {
  display: inline-flex; align-items: center; gap: 4px; min-height: 25px; padding: 1px 8px;
  border: 1px solid var(--line); border-radius: 15px; background: transparent; color: var(--text);
  font-size: 13px; cursor: pointer;
}
.chip:hover { background: var(--hover); }
.chip.on { border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent); }
.chip.icon-only { padding: 1px; width: 28px; height: 28px; border-radius: 50%; justify-content: center; }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; object-position: top; margin-left: -5px; }
/* Type icons are pale: the dark disc keeps them visible in the light theme. */
.icon { width: 20px; height: 20px; padding: 1px; object-fit: contain; margin-left: -5px; border-radius: 50%; background: #1d1e33; }
</style>
