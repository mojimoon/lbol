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

    <h2 :class="`rarity-${entity.rarity}`">{{ entity.name }}</h2>
    <ColorBar :colors="entity.colors" />

    <div class="tags">
      <span class="tag">{{ data.enums.CardType[entity.type] }}</span>
      <span class="tag">{{ data.enums.Rarity[entity.rarity] }}</span>
      <a v-if="entity.owner" class="tag link" :href="`#/characters/${entity.owner}`">{{ ownerName(entity.owner) }}</a>
      <span v-else class="tag">{{ t('owner.Neutral') }}</span>
      <span v-if="!entity.pooled" class="tag muted">{{ t('detail.notPooled') }}</span>
    </div>

    <section class="face">
      <header v-if="entity.up">
        <h3>{{ t('detail.before') }}</h3>
        <FaceCost :face="entity.base" />
      </header>
      <header v-else>
        <h3>{{ t('detail.notUpgradable') }}</h3>
        <FaceCost :face="entity.base" />
      </header>
      <RichText class="desc" :tokens="entity.base.desc" interactive />
    </section>
    <section v-if="entity.up" class="face upgraded">
      <header>
        <h3>{{ t('detail.after') }}</h3>
        <FaceCost :face="entity.up" />
      </header>
      <RichText class="desc" :tokens="entity.up.desc" interactive />
    </section>

    <RichText v-if="entity.detail.length" class="note" :tokens="entity.detail" interactive />
    <p v-if="entity.loyalty != null" class="muted-line">{{ t('detail.loyalty', { n: entity.loyalty }) }}</p>
    <RichText v-if="entity.flavor.length" class="flavor" :tokens="entity.flavor" />

    <RelatedList :cards="entity.relCards" :effects="entity.relEffects" :keywords="keywords" />

    <p v-if="currentIllustrator" class="muted-line">{{ t('detail.labeled', { label: t('detail.illustrator'), value: currentIllustrator }) }}</p>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { data, imgUrl, ownerName, t, upgraded } from '../../store/codex.js'
import ColorBar from '../shared/ColorBar.vue'
import FaceCost from '../shared/FaceCost.vue'
import RelatedList from '../shared/RelatedList.vue'
import RichText from '../shared/RichText.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const altIndex = ref(-1)
const alt = computed(() => props.entity.alts[altIndex.value])
const artStem = computed(() => alt.value?.img ?? ((upgraded.value && props.entity.imgUp) || props.entity.img))
const currentIllustrator = computed(() => alt.value?.ill ?? props.entity.illustrator)
const keywords = computed(() => [...new Set([...props.entity.base.keywords, ...(props.entity.up?.keywords ?? [])])])
</script>

<style scoped>
.card-detail { display: flex; flex-direction: column; gap: 12px; }
/* The game stretches every card image to this rectangle. */
.art-frame { aspect-ratio: 454 / 313; border-radius: var(--radius); overflow: hidden; background: var(--surface-2); }
.art-frame img { display: block; width: 100%; height: 100%; object-fit: fill; }
.alts { display: flex; flex-wrap: wrap; gap: 6px; }
.alt {
  padding: 3px 10px; font-size: 12px; border-radius: 12px; border: 1px solid var(--line);
  background: transparent; color: var(--text); cursor: pointer;
}
.alt.on { border-color: var(--accent); background: var(--selected); }
h2 { margin: 0; font-size: 21px; }
.rarity-Common { color: var(--rarity-common); }
.rarity-Uncommon { color: var(--rarity-uncommon); }
.rarity-Rare { color: var(--rarity-rare); }
.face { padding: 10px 12px; border-radius: 8px; background: var(--surface-2); border-left: 3px solid var(--line); }
.face.upgraded { border-left-color: var(--up); }
.face header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; }
.face h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--text-dim); }
.face.upgraded h3 { color: var(--up); }
.desc { font-size: 14.5px; line-height: 1.65; }
.note { font-size: 13px; line-height: 1.6; color: var(--text-dim); padding: 8px 10px; background: var(--surface-2); border-radius: 8px; }
.flavor { font-size: 13px; line-height: 1.6; font-style: italic; color: var(--text-dim); }
</style>
