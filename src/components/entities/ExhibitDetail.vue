<template>
  <article class="exhibit-detail">
    <img class="icon" :src="imgUrl('icons', entity.img)" :alt="entity.name" />
    <h2 :class="`rarity-${entity.rarity}`">{{ entity.name }}</h2>
    <div class="tags">
      <span class="tag">{{ t('detail.labeled', { label: t('filter.exhibitType'), value: data.enums.ExhibitType[entity.exhibitType] }) }}</span>
      <span class="tag">{{ t('detail.labeled', { label: t('filter.rarity'), value: data.enums.Rarity[entity.rarity] }) }}</span>
      <a v-if="entity.owner" class="tag link" :href="`#/characters/${entity.owner}`">{{ ownerName(entity.owner) }}</a>
      <span v-else class="tag">{{ t('owner.Neutral') }}</span>
      <span v-if="entity.appearance === 'NonShop'" class="tag muted">{{ t('appearance.NonShop') }}</span>
      <span v-if="!entity.pooled" class="tag muted">{{ t('detail.exhibitNotPooled') }}</span>
    </div>
    <RichText class="desc" :tokens="entity.desc" interactive />
    <RichText v-if="entity.flavor.length" class="flavor" :tokens="entity.flavor" />
    <RelatedList :cards="entity.relCards" :effects="entity.relEffects" :keywords="entity.keywords" />
  </article>
</template>

<script setup>
import { data, imgUrl, ownerName, t } from '../../store/codex.js'
import RelatedList from '../shared/RelatedList.vue'
import RichText from '../shared/RichText.vue'

defineProps({ entity: { type: Object, required: true } })
</script>

<style scoped>
.exhibit-detail { display: flex; flex-direction: column; gap: 12px; }
.icon { width: 128px; height: 128px; object-fit: contain; align-self: center; }
h2 { margin: 0; font-size: 21px; }
.desc { font-size: 15px; line-height: 1.7; }
.flavor { font-size: 13px; line-height: 1.6; font-style: italic; color: var(--text-dim); }
.rarity-Common { color: var(--rarity-common); }
.rarity-Uncommon { color: var(--rarity-uncommon); }
.rarity-Rare { color: var(--rarity-rare); }
.rarity-Shining { color: var(--rarity-shining); }
.rarity-Mythic { color: var(--rarity-mythic); }
</style>
