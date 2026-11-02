<template>
  <!-- Layout follows the game's 530×740 CardWidget; positions are percentages of that. -->
  <article class="card-tile" :class="`type-${entity.type}`">
    <img v-if="art" class="art" :src="imgUrl('cards', art)" alt="" loading="lazy" decoding="async" />
    <div v-if="odds" class="odds">
      <div v-for="row in oddsRows" :key="row.label">
        <span class="odds-label">{{ row.label }}: </span>
        <template v-for="(value, i) in row.values" :key="i">
          <template v-if="i">/</template><span :class="{ zero: value === '0.0' }">{{ value }}{{ i === row.values.length - 1 ? '%' : '' }}</span>
        </template>
      </div>
    </div>
    <img class="frame" :src="imgUrl('card-ui', entity.frames[0])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.frames[1]" class="frame sub" :src="imgUrl('card-ui', entity.frames[1])" alt="" loading="lazy" decoding="async" />
    <img v-if="entity.owner" class="watermark" :src="imgUrl('card-ui', `owner_${entity.owner.toLowerCase()}`)" alt="" loading="lazy" />

    <img class="type-icon" :src="imgUrl('card-ui', `type_${entity.type.toLowerCase()}`)" alt="" loading="lazy" />
    <span ref="typeEl" class="type-name">{{ data.enums.CardType[entity.type] }}</span>
    <!-- CardWidget hides the cost of a card that cannot be played. -->
    <ManaCost v-if="!face.forbidden" class="cost" :symbols="face.cost" size="10cqw" />

    <h3 ref="nameEl" class="name" :class="{ upgraded: showUp }">{{ displayName }}</h3>
    <div v-if="entity.type === 'Friend' && face.loyalty != null" class="loyalty" :title="t('detail.loyalty', { n: face.loyalty })">
      <img :src="imgUrl('card-ui', 'loyal')" alt="" loading="lazy" />
      <span :class="{ upgraded: showUp && face.loyalty !== entity.base.loyalty }">{{ face.loyalty }}</span>
    </div>
    <RichText ref="descEl" class="desc" :tokens="face.desc">
      <span v-if="owner" class="avatar-gap"></span>
    </RichText>

    <!-- The one thing the game's card face leaves out: whose card this is. -->
    <img v-if="owner" class="owner" :src="imgUrl('characters', owner.avatar)" :alt="owner.shortName" :title="owner.shortName" loading="lazy" />
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useFitText } from '../../composables/fitText.js'
import { cardFace, percent } from '../../config/collections.js'
import { data, findEntity, imgUrl, poolOdds, showOwnerAvatar, t, upgraded } from '../../store/codex.js'
import ManaCost from '../shared/ManaCost.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true }, noOdds: Boolean })
const showUp = computed(() => upgraded.value && !!props.entity.up)
const face = computed(() => cardFace(props.entity, upgraded.value))
const art = computed(() => (showUp.value && props.entity.imgUp) || props.entity.img)
const displayName = computed(() => `${props.entity.name}${showUp.value ? '+' : ''}`)
const owner = computed(() => (showOwnerAvatar.value && props.entity.owner ? findEntity('characters', props.entity.owner) : null))

const odds = computed(() => (props.noOdds ? null : poolOdds.value?.get(props.entity.id)))
const oddsRows = computed(() => [
  { label: t('odds.normalShort'), values: odds.value.normal.map(s => percent(s.p)) },
  { label: t('odds.eliteShort'), values: odds.value.elite.map(s => percent(s.p)) },
  { label: t('odds.shop'), values: [percent(odds.value.shop.p)] },
])

const descEl = ref(null)
const nameEl = ref(null)
useFitText(descEl, () => [face.value, owner.value], { max: 14, min: 8.5 })
useFitText(nameEl, displayName, { max: 15, min: 7.5 })
const typeEl = ref(null)
useFitText(typeEl, () => data.value.enums.CardType[props.entity.type], { max: 11.5, min: 7 })
</script>

<style scoped>
.card-tile {
  container-type: inline-size; position: relative; aspect-ratio: 530 / 740; color: #f1eff7;
  /* The frame is dark in both themes, whatever the page theme is. */
  --keyword: #f4c86c; --up: #72e094;
  transition: transform .12s;
}
@media (hover: hover) { a:hover .card-tile { transform: translateY(-3px); } }
.art { position: absolute; left: 7.17%; top: 9.26%; width: 85.66%; height: 42.3%; object-fit: fill; }
/* Centred on the art, and only as big as the text. */
.odds {
  position: absolute; left: 50%; top: 30.41%; transform: translate(-50%, 20%); width: 85.66%; padding: 1.5cqw 3cqw;
  background: #000b; color: #fff; text-align: center; font-size: 5.6cqw; line-height: 1.3;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.odds-label { color: var(--keyword); }
.odds .zero { color: #8f8f9c; }
.frame { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; pointer-events: none; }
/* Second colour of a two-colour card covers the right part of the frame. */
.frame.sub { mask-image: linear-gradient(90deg, transparent 42%, #000 58%); }
.watermark {
  position: absolute; left: 6.6%; width: 86.8%; top: 59.5%; height: 32.4%; object-fit: contain; opacity: .14; pointer-events: none;
}
.type-icon { position: absolute; left: 3.1%; top: 2.1%; width: 8.2%; height: 5.9%; object-fit: contain; }
.type-name {
  position: absolute; left: 13.2%; top: 3.18%; width: 26.6%; height: 6.08%; display: flex; align-items: center;
  white-space: nowrap; overflow: hidden;
}
.cost { position: absolute; right: 6.6%; top: 1.35%; height: 9.46%; max-width: 58%; align-items: center; justify-content: flex-end; overflow: hidden; }
.name {
  position: absolute; left: 9%; right: 9%; top: 51.8%; height: 6.76%; margin: 0; overflow: hidden;
  /* "safe": a centred overflow would hide on both sides, where the text fit cannot measure it. */
  display: flex; align-items: center; justify-content: safe center; text-align: center;
  font-weight: 700; line-height: 1.1; text-shadow: 0 1px 2px #000b; white-space: nowrap;
}
/* Leave room for the loyalty badge. */
.type-Friend .name { left: 15%; right: 7%; }
.name.upgraded { color: var(--up); }
/* Tool frames have a light ribbon. */
.type-Tool .name { color: #23232f; text-shadow: none; }
.type-Tool .name.upgraded { color: #14713a; }
.loyalty { position: absolute; left: -1%; top: 48.8%; width: 17%; aspect-ratio: 1; }
.loyalty img { width: 100%; height: 100%; }
.loyalty span {
  position: absolute; inset: 0 0 12% 0; display: flex; align-items: center; justify-content: center;
  font-size: max(15px, 9.5cqw); font-weight: 800; line-height: 1; text-shadow: 0 1px 2px #000;
}
.loyalty span.upgraded { color: var(--up); }
.desc { position: absolute; left: 7.5%; right: 7.5%; top: 59.6%; bottom: 4.5%; overflow-y: auto; scrollbar-width: none; line-height: 1.38; }
/* Text flows around the avatar in the frame's bottom right corner. */
.avatar-gap {
  float: right; width: 15cqw; height: 100%;
  shape-outside: inset(calc(100% - 13cqw) 0 0 0);
}
.owner {
  position: absolute; right: 7.6%; bottom: 5.2%; width: 13cqw; height: 13cqw; border-radius: 50%;
  object-fit: cover; object-position: top; background: #1a1a2c; box-shadow: 0 0 0 1.5px #000a;
}
</style>
