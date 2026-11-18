<template>
  <article class="enemy-tile">
    <img v-if="entity.img" class="portrait" :src="imgUrl('enemies', entity.img)" alt="" loading="lazy" decoding="async" />
    <div class="body">
      <h3 :class="`kind-${entity.kind}`">{{ entity.name }}</h3>
      <p v-if="entity.title" class="title">{{ entity.title }}</p>
      <p class="meta">{{ meta }}</p>
      <p class="hp">{{ t('enemy.hp') }} <DiffValue :value="entity.hp" /></p>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { data, imgUrl, t } from '../../store/codex.js'
import DiffValue from '../shared/DiffValue.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const meta = computed(() => [t(`enemyKind.${props.entity.kind}`), ...props.entity.stages.map(s => data.value.enemyStages[s])].join(' · '))
</script>

<style scoped>
.enemy-tile {
  height: 100%; display: flex; gap: 12px; padding: 10px 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--line);
}
a:hover .enemy-tile { border-color: var(--accent); }
.portrait { width: 64px; height: 64px; flex: none; border-radius: 8px; object-fit: cover; object-position: 50% 15%; background: var(--surface-2); }
.body { min-width: 0; }
h3 { margin: 0; font-size: 15px; }
.kind-Elite { color: var(--rarity-uncommon); }
.kind-Boss { color: var(--rarity-rare); }
.title { margin: 1px 0 0; font-size: 12.5px; color: var(--text-dim); }
.meta { margin: 3px 0 0; font-size: 12px; color: var(--text-dim); }
.hp { margin: 3px 0 0; font-size: 13px; }
</style>
