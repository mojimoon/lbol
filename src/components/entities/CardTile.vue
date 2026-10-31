<template>
  <article class="card-tile" :class="`rarity-${entity.rarity}`">
    <ColorBar :colors="entity.colors" />
    <div class="art">
      <img v-if="art" :src="imgUrl('cards', art)" alt="" loading="lazy" decoding="async" />
      <ManaCost class="cost" :symbols="face.cost" />
    </div>
    <div class="body">
      <h3 class="name" :class="{ upgraded: showUp }">{{ entity.name }}{{ showUp ? '+' : '' }}</h3>
      <p class="type">{{ data.enums.CardType[entity.type] }} · {{ data.enums.Rarity[entity.rarity] }}</p>
      <RichText class="desc" :tokens="face.desc" />
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { cardFace } from '../../config/collections.js'
import { data, imgUrl, upgraded } from '../../store/codex.js'
import ColorBar from '../shared/ColorBar.vue'
import ManaCost from '../shared/ManaCost.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const showUp = computed(() => upgraded.value && !!props.entity.up)
const face = computed(() => cardFace(props.entity, upgraded.value))
const art = computed(() => (showUp.value && props.entity.imgUp) || props.entity.img)
</script>

<style scoped>
.card-tile {
  height: 100%; display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--line); transition: transform .12s, border-color .12s;
}
a:hover .card-tile { transform: translateY(-2px); border-color: var(--rarity); }
.rarity-Common { --rarity: var(--rarity-common); }
.rarity-Uncommon { --rarity: var(--rarity-uncommon); }
.rarity-Rare { --rarity: var(--rarity-rare); }
.art { position: relative; aspect-ratio: 16 / 10; background: var(--surface-2); }
.art img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
.cost { position: absolute; top: 5px; left: 5px; padding: 2px 4px; border-radius: 12px; background: rgba(8, 8, 24, .72); }
.body { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
.name { margin: 0; font-size: 14.5px; font-weight: 600; color: var(--rarity); line-height: 1.35; }
.name.upgraded { color: var(--up); }
.type { margin: 0; font-size: 11.5px; color: var(--text-dim); }
.desc { font-size: 12.5px; line-height: 1.55; margin-top: 3px; }
</style>
