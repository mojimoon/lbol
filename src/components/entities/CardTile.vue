<template>
  <!-- Layout follows the game's 530×740 CardWidget; positions are percentages of that. -->
  <article class="card-tile" :class="`type-${entity.type}`">
    <img v-if="art" class="art" :src="imgUrl('cards', art)" alt="" loading="lazy" decoding="async" />
    <img class="frame" :src="imgUrl('card-ui', entity.frames[0])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.frames[1]" class="frame sub" :src="imgUrl('card-ui', entity.frames[1])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.owner" class="watermark" :src="imgUrl('card-ui', `owner_${entity.owner.toLowerCase()}`)" alt="" loading="lazy" />

    <ManaCost class="cost" :symbols="face.cost" size="8.2cqw" />
    <div class="badges">
      <img v-if="owner" class="owner" :src="imgUrl('characters', owner.avatar)" :alt="owner.shortName" :title="owner.shortName" loading="lazy" />
      <img class="type" :src="imgUrl('card-ui', `type_${entity.type.toLowerCase()}`)" :alt="typeName" :title="typeName" loading="lazy" />
    </div>

    <h3 class="name" :class="{ upgraded: showUp }">{{ entity.name }}{{ showUp ? '+' : '' }}</h3>
    <div v-if="entity.type === 'Friend' && entity.loyalty != null" class="loyalty" :title="t('detail.loyalty', { n: entity.loyalty })">
      <img :src="imgUrl('card-ui', 'loyal')" alt="" loading="lazy" />
      <span>{{ entity.loyalty }}</span>
    </div>
    <RichText class="desc" :class="`len-${lengthTier}`" :tokens="face.desc" />
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
const typeName = computed(() => data.value.enums.CardType[props.entity.type])

// The game shrinks long text to fit the card, so do the same in steps.
const lengthTier = computed(() => {
  const length = face.value.desc.reduce((n, tok) => n + (typeof tok === 'string' ? tok.length : (tok.t?.length ?? 2)), 0)
  if (length <= 50) return 0
  if (length <= 85) return 1
  return length <= 125 ? 2 : 3
})
</script>

<style scoped>
.card-tile {
  container-type: inline-size; position: relative; aspect-ratio: 530 / 740; color: #f1eff7;
  /* The frame is dark in both themes. */
  --keyword: #f4c86c; --up: #72e094;
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
.cost { position: absolute; left: 2%; top: 1.9%; max-width: 62%; overflow: hidden; }
.badges { position: absolute; right: 4.8%; top: 1.7%; display: flex; align-items: center; gap: 1.4cqw; }
.badges img { width: 10cqw; height: 10cqw; }
.owner { border-radius: 50%; object-fit: cover; object-position: top; box-shadow: 0 0 0 1px #0009; background: #1a1a2c; }
.type { object-fit: contain; filter: drop-shadow(0 0 1px #000); }
.name {
  position: absolute; left: 9%; right: 9%; top: 51.8%; height: 6.76%; margin: 0;
  display: flex; align-items: center; justify-content: center; text-align: center;
  font-size: 5.8cqw; font-weight: 700; line-height: 1.1; text-shadow: 0 1px 2px #000b; white-space: nowrap;
}
.name.upgraded { color: var(--up); }
/* Tool frames have a light ribbon. */
.type-Tool .name { color: #23232f; text-shadow: none; }
.type-Tool .name.upgraded { color: #14713a; }
.loyalty { position: absolute; left: -1%; top: 48.8%; width: 17%; aspect-ratio: 1; }
.loyalty img { width: 100%; height: 100%; }
.loyalty span {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 7cqw; font-weight: 700; text-shadow: 0 1px 2px #000;
}
.desc {
  position: absolute; left: 8%; right: 8%; top: 59.6%; bottom: 5%; overflow-y: auto; scrollbar-width: none;
  line-height: 1.42;
}
.len-0 { font-size: 5.6cqw; }
.len-1 { font-size: 5.1cqw; }
.len-2 { font-size: 4.6cqw; }
.len-3 { font-size: 4cqw; }
</style>
