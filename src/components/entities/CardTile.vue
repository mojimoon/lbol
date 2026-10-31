<template>
  <!-- Layout follows the game's 530×740 CardWidget; positions are percentages of that. -->
  <article class="card-tile" :class="`type-${entity.type}`">
    <img v-if="art" class="art" :src="imgUrl('cards', art)" alt="" loading="lazy" decoding="async" />
    <img class="frame" :src="imgUrl('card-ui', entity.frames[0])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.frames[1]" class="frame sub" :src="imgUrl('card-ui', entity.frames[1])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.owner" class="watermark" :src="imgUrl('card-ui', `owner_${entity.owner.toLowerCase()}`)" alt="" loading="lazy" />

    <img class="type-icon" :src="imgUrl('card-ui', `type_${entity.type.toLowerCase()}`)" alt="" loading="lazy" />
    <span class="type-name">{{ data.enums.CardType[entity.type] }}</span>
    <ManaCost class="cost" :symbols="face.cost" size="10cqw" />

    <h3 class="name" :class="{ upgraded: showUp }">{{ entity.name }}{{ showUp ? '+' : '' }}</h3>
    <div v-if="entity.type === 'Friend' && entity.loyalty != null" class="loyalty" :title="t('detail.loyalty', { n: entity.loyalty })">
      <img :src="imgUrl('card-ui', 'loyal')" alt="" loading="lazy" />
      <span>{{ entity.loyalty }}</span>
    </div>
    <RichText class="desc" :class="`len-${lengthTier}`" :tokens="face.desc" />

    <!-- The one thing the game's card face leaves out: whose card this is. -->
    <img v-if="owner" class="owner" :src="imgUrl('characters', owner.avatar)" :alt="owner.shortName" :title="owner.shortName" loading="lazy" />
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { cardFace } from '../../config/collections.js'
import { data, findEntity, imgUrl, t, upgraded } from '../../store/codex.js'
import ManaCost from '../shared/ManaCost.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const showUp = computed(() => upgraded.value && !!props.entity.up)
const face = computed(() => cardFace(props.entity, upgraded.value))
const art = computed(() => (showUp.value && props.entity.imgUp) || props.entity.img)
const owner = computed(() => (props.entity.owner ? findEntity('characters', props.entity.owner) : null))

// The game shrinks long text to fit the card, so do the same in steps.
const lengthTier = computed(() => {
  const length = face.value.desc.reduce((n, tok) => {
    if (typeof tok !== 'string') return n + (tok.t?.length ?? 2)
    return n + tok.length + (tok.split('\n').length - 1) * 8  // a line break wastes the rest of its line
  }, 0)
  if (length <= 34) return 0
  if (length <= 60) return 1
  if (length <= 90) return 2
  if (length <= 125) return 3
  return length <= 165 ? 4 : 5
})
</script>

<style scoped>
.card-tile {
  container-type: inline-size; position: relative; aspect-ratio: 530 / 740; color: #f1eff7;
  /* The frame is dark in both themes, whatever the page theme is. */
  --keyword: #f4c86c; --up: #72e094; --surface-2: #0d0d14; --line: #5a5a70; --rarity-rare: #f4c86c;
  transition: transform .12s;
}
a:hover .card-tile { transform: translateY(-3px); }
.art { position: absolute; left: 7.17%; top: 9.26%; width: 85.66%; height: 42.3%; object-fit: fill; }
.frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
/* Second colour of a two-colour card covers the right part of the frame. */
.frame.sub { mask-image: linear-gradient(90deg, transparent 42%, #000 58%); }
.watermark {
  position: absolute; left: 6.6%; width: 86.8%; top: 59.5%; height: 32.4%; object-fit: contain; opacity: .14; pointer-events: none;
}
.type-icon { position: absolute; left: 1.13%; top: 1.08%; width: 12.08%; height: 8.65%; object-fit: contain; }
.type-name {
  position: absolute; left: 13.2%; top: 3.18%; width: 26.6%; height: 6.08%; display: flex; align-items: center;
  font-size: 11.5px; white-space: nowrap; overflow: hidden;
}
.cost { position: absolute; right: 6.6%; top: 1.35%; height: 9.46%; max-width: 58%; align-items: center; justify-content: flex-end; overflow: hidden; }
.name {
  position: absolute; left: 9%; right: 9%; top: 51.8%; height: 6.76%; margin: 0;
  display: flex; align-items: center; justify-content: center; text-align: center;
  font-size: max(12px, 5.8cqw); font-weight: 700; line-height: 1.1; text-shadow: 0 1px 2px #000b; white-space: nowrap;
}
.name.upgraded { color: var(--up); }
/* Tool frames have a light ribbon. */
.type-Tool .name { color: #23232f; text-shadow: none; }
.type-Tool .name.upgraded { color: #14713a; }
.loyalty { position: absolute; left: -1%; top: 48.8%; width: 17%; aspect-ratio: 1; }
.loyalty img { width: 100%; height: 100%; }
.loyalty span {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: max(15px, 9.5cqw); font-weight: 800; text-shadow: 0 1px 2px #000;
}
.desc { position: absolute; left: 7.5%; right: 7.5%; top: 59.6%; bottom: 4.5%; overflow-y: auto; scrollbar-width: none; line-height: 1.38; }
/* Text keeps its size as cards shrink, and only long descriptions step down to fit. */
.len-0 { font-size: 13.5px; }
.len-1 { font-size: min(13px, 7cqw); }
.len-2 { font-size: min(12.5px, 6.2cqw); }
.len-3 { font-size: max(10px, min(12px, 5.5cqw)); }
.len-4 { font-size: max(9.5px, min(11px, 4.9cqw)); }
.len-5 { font-size: max(9px, min(10.5px, 4.4cqw)); }
.owner {
  position: absolute; right: 1.4%; bottom: 1%; width: 13cqw; height: 13cqw; border-radius: 50%;
  object-fit: cover; object-position: top; background: #1a1a2c; box-shadow: 0 0 0 1.5px #000a;
}
</style>
