<template>
  <article class="enemy-detail">
    <img v-if="entity.img" class="portrait" :src="imgUrl('enemies', entity.img)" :alt="entity.name" />
    <div>
      <h2 :class="`kind-${entity.kind}`">{{ entity.name }}</h2>
      <p v-if="entity.title" class="title">{{ entity.title }}</p>
    </div>
    <div class="tags">
      <span class="tag">{{ t(`enemyKind.${entity.kind}`) }}</span>
      <span v-for="s in entity.stages" :key="s" class="tag">{{ data.enemyStages[s] }}</span>
      <span class="tag muted">{{ entity.id }}</span>
      <a class="tag link" :href="entity.wiki" target="_blank" rel="noopener">{{ t('enemy.wiki') }}</a>
    </div>

    <DifficultyPicker />
    <dl class="stats">
      <div><dt>{{ t('enemy.hp') }}</dt><dd><DiffValue :value="entity.hp" /></dd></div>
      <div><dt>{{ t('enemy.power') }}</dt><dd><ManaIcon symbol="pt_Power" :label="t('enemy.power')" size="1em" /> {{ entity.power }}</dd></div>
    </dl>

    <section v-if="bossExhibits.length">
      <h3>{{ t('enemy.bossExhibits') }}</h3>
      <div class="boss-exhibits">
        <a v-for="e in bossExhibits" :key="e.id" class="boss-exhibit" :href="`#/exhibits/${e.id}`"
          @mouseenter="showTip(`e:${e.id}`, $event.currentTarget)" @mouseleave="hideTip">
          <img :src="imgUrl('icons', e.img)" alt="" loading="lazy" /><span>{{ e.name }}</span>
        </a>
      </div>
    </section>

    <section v-if="entity.passive.length">
      <h3>{{ t('enemy.passive') }}</h3>
      <RichText class="text" :tokens="entity.passive" interactive />
    </section>

    <section v-if="entity.moves.length">
      <h3>{{ t('enemy.moves') }}</h3>
      <div v-for="(move, i) in entity.moves" :key="i" class="move">
        <h4>{{ move.name }}</h4>
        <RichText class="text" :tokens="move.desc" interactive />
      </div>
    </section>

    <section v-for="block in textBlocks" :key="block.key">
      <h3>{{ t(block.key) }}</h3>
      <div v-for="(part, i) in block.sections" :key="i" class="part">
        <RichText v-if="part.title" class="part-title" :tokens="part.title" interactive />
        <RichText class="text" :tokens="part.body" interactive />
      </div>
    </section>

    <section v-if="entity.encounters.length">
      <h3>{{ t('enemy.encounters') }}</h3>
      <ul class="encounters">
        <li v-for="(e, i) in entity.encounters" :key="i">
          <span class="where">{{ data.enemyStages[e.stage] }} · {{ t(`enemyKind.${e.kind}`) }}</span>
          <span class="members">
            <template v-for="(m, j) in e.members" :key="j">
              <span v-if="m === entity.id" class="self">{{ entity.name }}</span>
              <a v-else-if="findEntity('enemies', m)" :href="`#/enemies/${m}`">{{ findEntity('enemies', m).name }}</a>
              <span v-else>{{ m }}</span>
            </template>
          </span>
        </li>
      </ul>
    </section>

    <section v-if="related.length">
      <h3>{{ t('enemy.related') }}</h3>
      <div class="chips">
        <a v-for="e in related" :key="e.id" class="chip" :href="`#/enemies/${e.id}`">
          <img v-if="e.img" :src="imgUrl('enemies', e.img)" alt="" loading="lazy" />{{ e.name }}
        </a>
      </div>
    </section>

    <section v-if="effects.length">
      <h3>{{ t('enemy.effects') }}</h3>
      <div v-for="e in effects" :key="e.ref" class="effect">
        <img v-if="e.icon" :src="imgUrl('icons', e.icon)" alt="" loading="lazy" />
        <div>
          <strong :class="{ negative: e.negative }">{{ e.name }}</strong>
          <RichText class="text small" :tokens="e.desc" interactive />
        </div>
      </div>
    </section>

    <section v-if="exhibits.length">
      <h3>{{ t('enemy.exhibits') }}</h3>
      <div class="chips"><TermButton v-for="e in exhibits" :key="e.id" :text="e.name" :term-ref="`e:${e.id}`" /></div>
    </section>

    <RelatedList :cards="entity.relCards" />

    <p class="note-box">{{ t('enemy.note') }}</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { data, existing, findEntity, hideTip, imgUrl, showTip, t } from '../../store/codex.js'
import DiffValue from '../shared/DiffValue.vue'
import ManaIcon from '../shared/ManaIcon.vue'
import DifficultyPicker from '../shared/DifficultyPicker.vue'
import RelatedList from '../shared/RelatedList.vue'
import RichText from '../shared/RichText.vue'
import TermButton from '../shared/TermButton.vue'

const props = defineProps({ entity: { type: Object, required: true } })
const textBlocks = computed(() => [
  { key: 'enemy.order', sections: props.entity.order },
  { key: 'enemy.mechanics', sections: props.entity.mechanics },
].filter(b => b.sections.length))
const related = computed(() => existing('enemies', props.entity.relEnemies))
const effects = computed(() => props.entity.relEffects
  .map(id => ({ ref: `s:${id}`, ...data.value.terms[`s:${id}`] }))
  .filter(e => e.name))
const exhibits = computed(() => existing('exhibits', props.entity.relExhibits))
const bossExhibits = computed(() => existing('exhibits', props.entity.bossExhibits))
</script>

<style scoped>
.enemy-detail { display: flex; flex-direction: column; gap: 12px; }
.portrait { width: 100%; max-height: 300px; object-fit: contain; border-radius: var(--radius); background: var(--surface-2); }
h2 { margin: 0; font-size: 21px; }
.kind-Elite { color: var(--rarity-uncommon); }
.kind-Boss { color: var(--rarity-rare); }
.title { margin: 2px 0 0; font-size: 13.5px; color: var(--text-dim); }
.stats { display: flex; gap: 24px; margin: 0; }
.stats div { display: flex; flex-direction: column; }
dt { font-size: 12px; color: var(--text-dim); }
dd { margin: 0; font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
section { border-top: 1px solid var(--line); padding-top: 10px; }
h3 { margin: 0 0 6px; font-size: 13px; font-weight: 600; color: var(--text-dim); }
h4 { margin: 0 0 2px; font-size: 14px; color: var(--accent); }
.move + .move, .part + .part { margin-top: 9px; }
.part-title { font-weight: 700; margin-bottom: 2px; }
.text { font-size: 14px; line-height: 1.65; }
.text.small { font-size: 13px; line-height: 1.55; }
.encounters { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; font-size: 13.5px; }
.where { color: var(--text-dim); margin-right: 8px; }
.members { display: inline-flex; flex-wrap: wrap; gap: 2px 8px; }
.self { font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 14px; }
.chip { display: inline-flex; align-items: center; gap: 5px; color: var(--text); text-decoration: none; }
.chip:hover { color: var(--accent); }
.chip img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; object-position: 50% 15%; }
.effect { display: flex; gap: 8px; }
.effect + .effect { margin-top: 8px; }
.effect img { width: 28px; height: 28px; flex: none; object-fit: contain; }
.effect strong { color: var(--keyword); font-size: 14px; }
.effect strong.negative { color: var(--negative); }
.boss-exhibits { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.boss-exhibit { display: inline-flex; align-items: center; gap: 6px; color: var(--rarity-shining); text-decoration: none; font-size: 14px; }
.boss-exhibit:hover { text-decoration: underline; }
.boss-exhibit img { width: 36px; height: 36px; object-fit: contain; }
.note-box { margin: 0; }
</style>
