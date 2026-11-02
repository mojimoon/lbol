<template>
  <section v-if="odds" class="odds-panel">
    <h3>{{ t('odds.title') }}<HintIcon v-model:open="noteOpen" :label="t('odds.title')" /></h3>
    <RichText v-if="noteOpen" class="note-box" :tokens="[t('odds.note')]" />
    <table>
      <thead>
        <tr>
          <th></th>
          <th v-for="n in ['1', '2', '3', '4+']" :key="n" scope="col">{{ t('odds.slot', { n }) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="kind in ['normal', 'elite']" :key="kind">
          <th scope="row">{{ t(`odds.${kind}`) }}</th>
          <td v-for="(slot, i) in odds[kind]" :key="i" :class="{ zero: percent(slot.p) === '0.0' }">
            {{ percent(slot.p) }}%<small>{{ weight(slot.w) }}</small>
          </td>
        </tr>
        <tr>
          <th scope="row">{{ t('odds.shop') }}</th>
          <td colspan="4" class="wide">{{ percent(odds.shop.p) }}%<small>{{ weight(odds.shop.w) }}</small></td>
        </tr>
      </tbody>
    </table>
    <dl>
      <dt>{{ t('odds.rarity') }}</dt>
      <dd>{{ t('odds.normalShort') }} {{ weight(odds.rarity.normal) }} / {{ t('odds.eliteShort') }} {{ weight(odds.rarity.elite) }} / {{ t('odds.shop') }} {{ weight(odds.rarity.shop) }}</dd>
      <dt>{{ t('odds.color') }}</dt>
      <dd>{{ weight(odds.color) }}</dd>
      <dt>{{ t('odds.cost') }}</dt>
      <dd>{{ weight(odds.cost) }}</dd>
    </dl>
  </section>
  <p v-else-if="poolOdds" class="outside">{{ t('odds.outside') }}</p>
</template>

<script setup>
import { computed, ref } from 'vue'
import { percent } from '../../config/collections.js'
import { poolOdds, t } from '../../store/codex.js'
import HintIcon from '../shared/HintIcon.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ card: { type: Object, required: true } })
const odds = computed(() => poolOdds.value?.get(props.card.id))
const weight = w => +w.toFixed(4)
const noteOpen = ref(false)
</script>

<style scoped>
.odds-panel { padding: 10px 12px; border-radius: 8px; background: var(--surface-2); border-left: 3px solid var(--accent); font-size: 13px; }
h3 { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--text-dim); }
table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { font-weight: 400; color: var(--text-dim); text-align: left; white-space: nowrap; padding: 2px 6px 2px 0; }
thead th { font-size: 12px; text-align: right; padding-right: 0; }
td { text-align: right; padding: 2px 0 2px 4px; vertical-align: top; }
td small { display: block; font-size: 11px; color: var(--text-dim); }
dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; margin: 8px 0 0; }
dt { color: var(--text-dim); white-space: nowrap; }
dd { margin: 0; font-variant-numeric: tabular-nums; }
.note-box { margin-bottom: 8px; background: var(--surface); }
td.zero { color: var(--text-dim); }
.outside { margin: 0; }
</style>
