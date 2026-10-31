<template>
  <article class="character-detail">
    <img v-if="entity.stand" class="stand" :src="imgUrl('characters', entity.stand)" :alt="entity.name" />
    <h2>{{ entity.fullName }}</h2>
    <p class="title">{{ entity.title }}</p>

    <dl class="stats">
      <div><dt>{{ t('char.hp') }}</dt><dd>{{ entity.hp }}</dd></div>
      <div><dt>{{ t('char.money') }}</dt><dd>{{ entity.money }}</dd></div>
      <div><dt>{{ t('char.power') }}</dt><dd>{{ entity.power }}</dd></div>
      <div v-if="entity.home"><dt>{{ t('char.home') }}</dt><dd class="home">{{ entity.home }}</dd></div>
      <div class="wide"><dt>{{ t('char.mana') }}</dt><dd><ManaCost :symbols="entity.mana" size="22px" wrap /></dd></div>
    </dl>

    <LoadoutSection
      v-for="(side, i) in ['A', 'B']"
      :key="side"
      :loadout="entity.loadouts[side]"
      :color="entity.colors[i]"
    />
  </article>
</template>

<script setup>
import { imgUrl, t } from '../../store/codex.js'
import ManaCost from '../shared/ManaCost.vue'
import LoadoutSection from './LoadoutSection.vue'

defineProps({ entity: { type: Object, required: true } })
</script>

<style scoped>
.character-detail { display: flex; flex-direction: column; gap: 12px; }
.stand { max-width: 100%; max-height: 420px; object-fit: contain; align-self: center; }
h2 { margin: 0; font-size: 21px; color: var(--accent); }
.title { margin: -8px 0 0; color: var(--text-dim); font-size: 14px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0; }
.stats .wide { grid-column: 1 / -1; }
.stats dt { font-size: 12px; color: var(--text-dim); }
.stats dd { margin: 2px 0 0; font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }
.stats dd.home { font-size: 14px; font-weight: 500; }
</style>
