<template>
  <component :is="facet.collapsible ? 'details' : 'div'" class="facet" :open="facet.collapsible ? startOpen : undefined">
    <component :is="facet.collapsible ? 'summary' : 'div'" class="facet-label">
      {{ t(facet.label) }}<HintIcon v-if="facet.hint" v-model:open="hintOpen" :label="t(facet.label)" /><span v-if="activeCount" class="count">{{ activeCount }}</span>
    </component>
    <RichText v-if="hintOpen" class="note-box" :tokens="[t(facet.hint)]" />
    <div class="chips" role="group" :aria-label="t(facet.label)">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="chip"
        :class="{ on: active.includes(opt.value), 'icon-only': opt.mana && !shareText(opt.value) }"
        :aria-pressed="active.includes(opt.value)"
        :title="opt.label"
        @click="toggleFacet(facet.key, opt.value)"
      >
        <ManaIcon v-if="opt.mana" :symbol="opt.mana" :label="opt.label" size="20px" />
        <img v-else-if="opt.avatar" class="avatar" :src="imgUrl('characters', opt.avatar)" alt="" loading="lazy" />
        <img v-else-if="opt.icon" class="icon" :src="imgUrl('card-ui', opt.icon)" alt="" loading="lazy" />
        <span v-if="!opt.mana">{{ opt.label }}</span>
        <span v-if="shareText(opt.value)" class="share">{{ shareText(opt.value) }}</span>
      </button>
    </div>
  </component>
</template>

<script setup>
import { computed, ref } from 'vue'
import { oddsShares, percent } from '../../config/collections.js'
import { currentState, data, imgUrl, poolOdds, t, toggleFacet, upgraded } from '../../store/codex.js'
import HintIcon from '../shared/HintIcon.vue'
import ManaIcon from '../shared/ManaIcon.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ facet: { type: Object, required: true } })
const options = computed(() => props.facet.options(data.value, t))
const active = computed(() => currentState.value.facets[props.facet.key])
const activeCount = computed(() => active.value.length)
const shares = computed(() => (props.facet.oddsShare && poolOdds.value
  ? oddsShares(props.facet, options.value.map(o => o.value), poolOdds.value, { upgraded: upgraded.value })
  : null))
const shareText = value => (shares.value?.[value] > 0 ? `${percent(shares.value[value])}%` : '')
const hintOpen = ref(false)
// Only the initial state: clearing the last chip must not collapse the group under the cursor.
const startOpen = activeCount.value > 0
</script>

<style scoped>
.facet-label { font-size: 12.5px; line-height: 1.3; color: var(--text-dim); margin-bottom: 3px; display: block; }
summary.facet-label { display: list-item; cursor: pointer; }
.facet .note-box { margin-bottom: 5px; }
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
@media (hover: hover) { .chip:hover { background: var(--hover); } }
.share { font-size: 11.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
.chip.on { border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent); }
.chip.icon-only { padding: 1px; width: 28px; height: 28px; border-radius: 50%; justify-content: center; }
@media (pointer: coarse) {
  .facet-label { font-size: 13.5px; margin-bottom: 5px; }
  .chips { gap: 6px; }
  .chip { min-height: 34px; padding: 2px 11px; font-size: 14px; }
  .chip.icon-only { width: 36px; height: 36px; }
}
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; object-position: top; margin-left: -5px; }
/* Type icons are pale: the dark disc keeps them visible in the light theme. */
.icon { width: 20px; height: 20px; padding: 1px; object-fit: contain; margin-left: -5px; border-radius: 50%; background: #1d1e33; }
</style>
