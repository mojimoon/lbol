<template>
  <article class="exhibit-tile">
    <img class="icon" :src="imgUrl('icons', entity.img)" alt="" loading="lazy" decoding="async" />
    <div class="body">
      <h3 :class="`rarity-${entity.rarity}`">{{ entity.name }}</h3>
      <p class="meta">{{ meta }}</p>
      <RichText class="desc" :tokens="entity.desc" />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { data, imgUrl, ownerName } from '../../store/codex.js'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true } })
// For most exhibits the type and rarity read the same ("普通"); show that word once.
const meta = computed(() => {
  const { exhibitType, rarity, owner } = props.entity
  const parts = [data.value.enums.ExhibitType[exhibitType], data.value.enums.Rarity[rarity], owner && ownerName(owner)]
  return [...new Set(parts.filter(Boolean))].join(' · ')
})
</script>

<style scoped>
.exhibit-tile {
  height: 100%; display: flex; gap: 12px; padding: 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--line);
}
a:hover .exhibit-tile { border-color: var(--accent); }
.icon { width: 64px; height: 64px; flex: none; object-fit: contain; }
.body { min-width: 0; }
h3 { margin: 0; font-size: 15px; }
.meta { margin: 2px 0 5px; font-size: 12px; color: var(--text-dim); }
.desc { font-size: 13px; line-height: 1.55; }
.rarity-Common { color: var(--rarity-common); }
.rarity-Uncommon { color: var(--rarity-uncommon); }
.rarity-Rare { color: var(--rarity-rare); }
.rarity-Shining { color: var(--rarity-shining); }
.rarity-Mythic { color: var(--rarity-mythic); }
</style>
