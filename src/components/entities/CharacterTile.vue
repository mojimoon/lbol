<template>
  <article class="character-tile">
    <img class="portrait" :src="imgUrl('characters', entity.avatar || entity.portrait)" alt="" loading="lazy" />
    <div class="caption">
      <h3>{{ entity.name }}</h3>
      <p>{{ entity.title }}</p>
      <div class="mana"><ManaIcon v-for="c in entity.colors" :key="c" :symbol="c" :label="t(`mana.${c}`)" size="20px" /></div>
    </div>
  </article>
</template>

<script setup>
import { imgUrl, t } from '../../store/codex.js'
import ManaIcon from '../shared/ManaIcon.vue'

defineProps({ entity: { type: Object, required: true } })
</script>

<style scoped>
.character-tile { height: 100%; overflow: hidden; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--line); }
a:hover .character-tile { border-color: var(--accent); }
.portrait { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; object-position: top; background: var(--surface-2); }
.caption { padding: 10px 12px 12px; }
h3 { margin: 0; font-size: 16px; }
p { margin: 2px 0 8px; font-size: 13px; color: var(--text-dim); }
.mana { display: flex; gap: 4px; }
</style>
