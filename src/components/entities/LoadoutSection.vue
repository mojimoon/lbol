<template>
  <section class="loadout">
    <h3>
      <ManaIcon :symbol="color" :label="t(`mana.${color}`)" size="20px" />
      {{ t('char.loadout', { color: t(`mana.${color}`) }) }}
      <span class="difficulty">{{ t('char.difficulty', { n: loadout.difficulty }) }}</span>
    </h3>

    <div v-if="loadout.ultimate" class="block">
      <h4>{{ t('char.ultimate') }} · {{ loadout.ultimate.name }}</h4>
      <p class="cost">{{ t('char.cost', { n: loadout.ultimate.cost }) }}</p>
      <RichText class="text" :tokens="loadout.ultimate.desc" interactive />
    </div>

    <div v-if="exhibit" class="block">
      <h4>{{ t('char.exhibit') }}</h4>
      <a class="exhibit" :href="`#/exhibits/${exhibit.id}`">
        <img :src="imgUrl('icons', exhibit.img)" alt="" />
        <span>{{ exhibit.name }}</span>
      </a>
      <RichText class="text" :tokens="exhibit.desc" interactive />
    </div>

    <div class="block">
      <h4>{{ t('char.deck') }}</h4>
      <ul class="deck">
        <li v-for="c in deck" :key="c.card.id">
          <a :href="`#/cards/${c.card.id}`">
            <ManaCost :symbols="c.card.base.cost" size="16px" />
            <span class="deck-name">{{ c.card.name }}</span>
            <span class="deck-count">×{{ c.count }}</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { findEntity, imgUrl, t } from '../../store/codex.js'
import ManaCost from '../shared/ManaCost.vue'
import ManaIcon from '../shared/ManaIcon.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ loadout: { type: Object, required: true }, color: { type: String, required: true } })
const exhibit = computed(() => findEntity('exhibits', props.loadout.exhibit))
const deck = computed(() => props.loadout.deck
  .map(({ id, count }) => ({ card: findEntity('cards', id), count }))
  .filter(c => c.card))
</script>

<style scoped>
.loadout { border-top: 1px solid var(--line); padding-top: 12px; display: flex; flex-direction: column; gap: 12px; }
h3 { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 16px; }
.difficulty { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--text-dim); }
h4 { margin: 0 0 4px; font-size: 13px; font-weight: 600; color: var(--accent); }
.cost { margin: 0 0 4px; font-size: 12px; color: var(--text-dim); }
.text { font-size: 13.5px; line-height: 1.6; }
.exhibit { display: inline-flex; align-items: center; gap: 8px; color: inherit; font-size: 14px; margin-bottom: 4px; }
.exhibit img { width: 36px; height: 36px; object-fit: contain; }
.deck { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.deck a { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border-radius: 6px; color: inherit; text-decoration: none; font-size: 13.5px; }
.deck a:hover { background: var(--hover); }
.deck-name { flex: 1; min-width: 0; }
.deck-count { color: var(--text-dim); font-variant-numeric: tabular-nums; }
</style>
