<template>
  <article class="card-detail">
    <div class="art-frame">
      <img v-if="artStem" :src="imgUrl('cards', artStem)" :alt="entity.name" />
    </div>
    <div v-if="entity.alts.length" class="alts" role="group" :aria-label="t('detail.altArt')">
      <button type="button" class="alt" :class="{ on: altIndex === -1 }" :aria-pressed="altIndex === -1" @click="altIndex = -1">
        {{ t('detail.defaultArt') }}
      </button>
      <button
        v-for="(a, i) in entity.alts" :key="a.img" type="button" class="alt"
        :class="{ on: altIndex === i }" :aria-pressed="altIndex === i" @click="altIndex = i"
      >{{ a.ill }}</button>
    </div>

    <header class="head">
      <h2 :class="`rarity-${entity.rarity}`">{{ entity.name }}{{ showUp ? '+' : '' }}</h2>
      <ManaCost :symbols="face.cost" size="24px" />
    </header>
    <ColorBar :colors="entity.colors" />

    <div class="tags">
      <span class="tag">{{ data.enums.CardType[entity.type] }}</span>
      <span class="tag">{{ data.enums.Rarity[entity.rarity] }}</span>
      <a v-if="entity.owner" class="tag link" :href="`#/characters/${entity.owner}`">{{ ownerName(entity.owner) }}</a>
      <span v-else class="tag">{{ t('owner.Neutral') }}</span>
      <span v-if="!entity.pooled" class="tag muted">{{ t('detail.notPooled') }}</span>
    </div>

    <label v-if="entity.up" class="upgrade-toggle">
      <input v-model="upgraded" type="checkbox" />
      {{ t('detail.upgrade') }}
    </label>
    <p v-else class="muted-line">{{ t('detail.notUpgradable') }}</p>

    <RichText class="desc" :tokens="face.desc" interactive />
    <RichText v-if="entity.detail.length" class="note" :tokens="entity.detail" interactive />
    <p v-if="entity.loyalty != null" class="muted-line">{{ t('detail.loyalty', { n: entity.loyalty }) }}</p>
    <RichText v-if="entity.flavor.length" class="flavor" :tokens="entity.flavor" />

    <RelatedList :cards="entity.relCards" :effects="entity.relEffects" :keywords="face.keywords" />

    <p v-if="currentIllustrator" class="muted-line">{{ t('detail.labeled', { label: t('detail.illustrator'), value: currentIllustrator }) }}</p>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { cardFace } from '../../config/collections.js'
import { data, imgUrl, ownerName, t, upgraded } from '../../store/codex.js'
import ColorBar from '../shared/ColorBar.vue'
import ManaCost from '../shared/ManaCost.vue'
import RelatedList from '../shared/RelatedList.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const altIndex = ref(-1)
const showUp = computed(() => upgraded.value && !!props.entity.up)
const face = computed(() => cardFace(props.entity, upgraded.value))
const alt = computed(() => props.entity.alts[altIndex.value])
const artStem = computed(() => alt.value?.img ?? ((showUp.value && props.entity.imgUp) || props.entity.img))
const currentIllustrator = computed(() => alt.value?.ill ?? props.entity.illustrator)
</script>

<style scoped>
.card-detail { display: flex; flex-direction: column; gap: 12px; }
.art-frame { border-radius: var(--radius); overflow: hidden; background: var(--surface-2); min-height: 120px; }
.art-frame img { display: block; width: 100%; height: auto; }
.alts { display: flex; flex-wrap: wrap; gap: 6px; }
.alt {
  padding: 3px 10px; font-size: 12px; border-radius: 12px; border: 1px solid var(--line);
  background: transparent; color: var(--text); cursor: pointer;
}
.alt.on { border-color: var(--accent); background: var(--selected); }
.head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
h2 { margin: 0; font-size: 21px; }
.rarity-Common { color: var(--rarity-common); }
.rarity-Uncommon { color: var(--rarity-uncommon); }
.rarity-Rare { color: var(--rarity-rare); }
.upgrade-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.upgrade-toggle input { accent-color: var(--up); width: 16px; height: 16px; }
.desc { font-size: 15px; line-height: 1.7; }
.note { font-size: 13px; line-height: 1.6; color: var(--text-dim); padding: 8px 10px; background: var(--surface-2); border-radius: 8px; }
.flavor { font-size: 13px; line-height: 1.6; font-style: italic; color: var(--text-dim); }
</style>
