<template>
  <div v-if="keywordTerms.length || effectTerms.length || relatedCards.length" class="related">
    <section v-if="keywordTerms.length">
      <h4>{{ t('detail.keywords') }}</h4>
      <div class="items"><TermButton v-for="k in keywordTerms" :key="k.ref" :text="k.name" :term-ref="k.ref" /></div>
    </section>
    <section v-if="effectTerms.length">
      <h4>{{ t('detail.relatedEffects') }}</h4>
      <div class="items"><TermButton v-for="k in effectTerms" :key="k.ref" :text="k.name" :term-ref="k.ref" /></div>
    </section>
    <section v-if="relatedCards.length">
      <h4>{{ t('detail.relatedCards') }}</h4>
      <ul class="cards">
        <li v-for="c in relatedCards" :key="c.id">
          <a :href="`#/cards/${encodeURIComponent(c.id)}`" :aria-label="c.name"><CardTile :entity="c" /></a>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { data, existing, t } from '../../store/codex.js'
import CardTile from '../entities/CardTile.vue'
import TermButton from './TermButton.vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  effects: { type: Array, default: () => [] },
  keywords: { type: Array, default: () => [] },
})
const termList = (prefix, ids) => ids
  .map(id => ({ ref: `${prefix}:${id}`, name: data.value.terms[`${prefix}:${id}`]?.name }))
  .filter(k => k.name)
const keywordTerms = computed(() => termList('k', props.keywords))
const effectTerms = computed(() => termList('s', props.effects))
const relatedCards = computed(() => existing('cards', props.cards))
</script>

<style scoped>
.related { display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--line); padding-top: 12px; }
h4 { margin: 0 0 5px; font-size: 12.5px; font-weight: 500; color: var(--text-dim); }
.items { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 14px; }
.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.cards a { display: block; color: inherit; text-decoration: none; border-radius: var(--radius); }
</style>
