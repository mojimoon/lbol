<template>
  <details class="pool-filter" :open="startOpen">
    <summary>{{ t('pool.title') }}<HintIcon v-model:open="rulesOpen" :label="t('pool.title')" /><span v-if="pool.enabled" class="on-mark" aria-hidden="true"></span></summary>
    <RichText v-if="rulesOpen" class="note-box" :tokens="data.poolRules" />

    <label class="check">
      <input v-model="pool.enabled" type="checkbox" />
      {{ t('pool.enable') }}
    </label>

    <div class="group">
      <div class="group-label">{{ t('filter.owner') }}</div>
      <div class="routes" role="radiogroup" :aria-label="t('filter.owner')">
        <div v-for="c in data.characters" :key="c.id" class="character" :class="{ on: pool.route?.startsWith(`${c.id}.`) }">
          <img class="avatar" :src="imgUrl('characters', c.avatar)" alt="" loading="lazy" />
          <span class="character-name">{{ c.shortName }}</span>
          <div class="sides">
            <button
              v-for="(side, i) in ['A', 'B']" :key="side" type="button" class="mana-button route" role="radio"
              :class="{ on: pool.route === `${c.id}.${side}` }" :aria-checked="pool.route === `${c.id}.${side}`"
              :aria-label="`${c.shortName} ${t(`mana.${c.colors[i]}`)}`" :title="`${c.shortName} ${t(`mana.${c.colors[i]}`)}`"
              @click="pickRoute(`${c.id}.${side}`)"
            >
              <ManaIcon :symbol="c.colors[i]" :label="t(`mana.${c.colors[i]}`)" size="18px" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="group">
      <div class="group-label">{{ t('pool.exhibits') }}</div>
      <div v-for="row in exhibitRows" :key="row.key" class="exhibit-row" role="group" :aria-label="row.label">
        <span class="row-mana" :title="row.label">
          <span v-if="row.key === 'random'" class="random-mark" aria-hidden="true">?</span>
          <ManaIcon v-else :symbol="row.key" :label="row.label" size="18px" />
        </span>
        <button
          v-for="e in row.exhibits" :key="e.id" type="button" class="exhibit" :class="{ on: pool.exhibits.includes(e.id) }"
          :aria-pressed="pool.exhibits.includes(e.id)" :aria-label="e.name"
          @click="toggleExhibit(e.id)"
          @mouseenter="showTip(`e:${e.id}`, $event.currentTarget)" @mouseleave="hideTip"
          @focus="showTip(`e:${e.id}`, $event.currentTarget)" @blur="hideTip"
        >
          <img class="exhibit-icon" :src="imgUrl('icons', e.img)" alt="" loading="lazy" />
          <img v-if="e.owner" class="exhibit-owner" :src="imgUrl('characters', findEntity('characters', e.owner)?.avatar)" alt="" loading="lazy" />
        </button>
      </div>
      <RichText v-if="pool.exhibits.includes(BLANK_CARD)" class="note-box" :tokens="[t('pool.blankHint')]" />
    </div>

    <div class="group">
      <div class="group-label">{{ t('pool.events') }}</div>
      <div v-for="event in events" :key="event.key" class="event" role="group" :aria-label="event.label">
        <span class="event-name">{{ event.label }}</span>
        <button
          v-for="color in event.from" :key="color" type="button" class="mana-button" :class="{ on: pool[event.key] === color }"
          :aria-pressed="pool[event.key] === color" :disabled="!(event.have[color] > 0)"
          @click="pickEvent(event.key, color)"
        >
          <ManaIcon :symbol="color" :label="t(`mana.${color}`)" size="20px" />
        </button>
        <span class="arrow" aria-hidden="true">→</span>
        <ManaCost :symbols="event.to" size="20px" />
      </div>
    </div>

    <div class="group">
      <div class="group-label">{{ t('pool.mana') }}</div>
      <div class="total">
        <ManaCost :symbols="symbols" size="22px" wrap />
        <span class="total-count">({{ symbols.length }})</span>
      </div>
    </div>

    <template v-if="poolChanges && (poolChanges.added.length || poolChanges.removed.length)">
      <button type="button" class="changes-toggle" :aria-expanded="changesOpen" @click="changesOpen = !changesOpen">
        <span class="caret" :class="{ open: changesOpen }" aria-hidden="true">▸</span>{{ t('pool.changes') }}
        <span v-if="poolChanges.added.length" class="plus">+{{ poolChanges.added.length }}</span>
        <span v-if="poolChanges.removed.length" class="minus">−{{ poolChanges.removed.length }}</span>
      </button>
      <div v-if="changesOpen" class="note-box changes">
        <div v-for="line in changeLines" :key="line.kind" class="change-line">
          {{ t(`pool.${line.kind}`) }}：<RichText class="names" :tokens="line.tokens" interactive />
          <button type="button" class="link-button preview" @click="jumpToPoolDiff(line.kind)">[{{ t('pool.preview') }}]</button>
        </div>
      </div>
    </template>
  </details>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { BLANK_CARD, MANA_ORDER, PURIFY_FROM, REFINE_FROM, shiningExhibits } from '../../config/collections.js'
import { currentState, data, findEntity, hideTip, imgUrl, jumpToPoolDiff, poolChanges, resolvedPool, showTip, t } from '../../store/codex.js'
import HintIcon from '../shared/HintIcon.vue'
import ManaCost from '../shared/ManaCost.vue'
import ManaIcon from '../shared/ManaIcon.vue'
import RichText from '../shared/RichText.vue'

const pool = computed(() => currentState.value.pool)
// Only the initial state: unticking the filter must not collapse the panel under the cursor.
const startOpen = pool.value.enabled
const rulesOpen = ref(false)
const changesOpen = ref(false)

const exhibitRows = computed(() => shiningExhibits(data.value).map(row => ({
  ...row,
  label: row.key === 'random' ? t('pool.random') : t(`mana.${row.key}`),
})))
const events = computed(() => [
  { key: 'purify', label: t('pool.purify'), from: PURIFY_FROM, to: ['C', 'C'], have: resolvedPool.value.beforeEvents },
  { key: 'refine', label: t('pool.refine'), from: REFINE_FROM, to: ['P'], have: resolvedPool.value.afterPurify },
])
const symbols = computed(() => MANA_ORDER.flatMap(c => Array(resolvedPool.value.mana[c]).fill(c)))
const changeLines = computed(() => ['added', 'removed']
  .filter(kind => poolChanges.value[kind].length)
  .map(kind => ({
    kind,
    tokens: poolChanges.value[kind].flatMap((c, i) => [...(i ? ['、'] : []), { t: c.name, r: `c:${c.id}` }]),
  })))

const loadoutExhibit = route => {
  const [id, side] = (route ?? '').split('.')
  return findEntity('characters', id)?.loadouts[side]?.exhibit
}
function pickRoute(route) {
  const next = pool.value.route === route ? null : route
  const old = loadoutExhibit(pool.value.route)
  const start = loadoutExhibit(next)
  pool.value.exhibits = [...new Set([...pool.value.exhibits.filter(id => id !== old), ...(start ? [start] : [])])]
  pool.value.route = next
  pool.value.enabled = true
}
function toggleExhibit(id) {
  const list = pool.value.exhibits
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
  pool.value.enabled = true
}
function pickEvent(key, color) {
  pool.value[key] = pool.value[key] === color ? null : color
  pool.value.enabled = true
}
// Taking away the exhibit that paid for a conversion also cancels the conversion.
watchEffect(() => {
  const { beforeEvents, afterPurify } = resolvedPool.value
  if (pool.value.purify && !(beforeEvents[pool.value.purify] > 0)) pool.value.purify = null
  if (pool.value.refine && !(afterPurify[pool.value.refine] > 0)) pool.value.refine = null
})
</script>

<style scoped>
summary { font-size: 12.5px; line-height: 1.3; color: var(--text-dim); cursor: pointer; }
.pool-filter[open] summary { margin-bottom: 5px; }
.pool-filter .note-box { margin-bottom: 6px; }
.on-mark { display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: var(--accent); }
.check { display: flex; align-items: center; gap: 6px; font-size: 13px; line-height: 1.3; cursor: pointer; margin-bottom: 6px; }
.check input { accent-color: var(--accent); width: 16px; height: 16px; flex: none; }
.group { margin-bottom: 7px; }
.group-label { font-size: 12px; line-height: 1.3; color: var(--text-dim); margin-bottom: 3px; }

/* One column per character: who, then which of their two routes. */
.routes { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 3px; }
.character {
  display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; padding: 4px 1px;
  border: 1px solid transparent; border-radius: 8px;
}
.character.on { border-color: var(--line); background: var(--surface-2); }
.avatar { width: 34px; height: 34px; flex: none; border-radius: 50%; object-fit: cover; object-position: top; }
.character-name { max-width: 100%; font-size: 11.5px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sides { display: flex; gap: 2px; margin-top: 1px; }
.route.mana-button { width: 24px; height: 24px; }
.exhibit.on, .mana-button.on {
  border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent);
}

.exhibit-row { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-bottom: 3px; }
.row-mana { display: inline-flex; align-items: center; justify-content: center; width: 20px; flex: none; margin-right: 2px; }
.random-mark {
  display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%;
  border: 1px solid var(--text-dim); color: var(--text-dim); font-size: 11px; line-height: 1;
}
.exhibit {
  position: relative; width: 30px; height: 30px; padding: 1px; flex: none;
  border: 1px solid var(--line); border-radius: 8px; background: transparent; cursor: pointer;
}
.exhibit-icon { display: block; width: 100%; height: 100%; object-fit: contain; }
.exhibit-owner {
  position: absolute; right: -2px; bottom: -2px; width: 14px; height: 14px; border-radius: 50%;
  object-fit: cover; object-position: top; background: var(--surface-2); box-shadow: 0 0 0 1px var(--bg);
}

.event { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-bottom: 3px; }
.event-name { font-size: 13px; margin-right: 3px; }
.mana-button {
  display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0;
  border: 1px solid var(--line); border-radius: 50%; background: transparent; cursor: pointer;
}
.mana-button:disabled { opacity: .3; cursor: not-allowed; }
.arrow { margin: 0 2px; color: var(--text-dim); }

.total { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-height: 22px; }
.total-count { font-size: 13px; color: var(--text-dim); font-variant-numeric: tabular-nums; }

.changes-toggle {
  display: flex; align-items: center; gap: 5px; width: 100%; padding: 2px 0; margin-bottom: 4px; border: 0; background: transparent;
  color: var(--text-dim); font-size: 12px; text-align: left; cursor: pointer;
}
.caret { display: inline-block; transition: transform .1s; }
.caret.open { transform: rotate(90deg); }
.plus { color: var(--up); font-variant-numeric: tabular-nums; }
.minus { color: var(--negative); font-variant-numeric: tabular-nums; }
.change-line { margin-bottom: 6px; }
.change-line:last-child { margin-bottom: 0; }
.names { display: inline; }
.preview { margin-left: 4px; }

@media (hover: hover) {
  .exhibit:hover, .mana-button:hover:not(:disabled) { background: var(--hover); }
}
@media (pointer: coarse) {
  summary { font-size: 13.5px; }
  .check { min-height: 32px; font-size: 14px; }
  .group-label { font-size: 13px; margin-bottom: 5px; }
  .exhibit-row { gap: 6px; }
  .avatar { width: 40px; height: 40px; }
  .character-name { font-size: 12.5px; }
  .sides { gap: 4px; margin-top: 3px; }
  .route.mana-button { width: 30px; height: 30px; }
  .exhibit { width: 38px; height: 38px; }
  .event { gap: 4px; margin-bottom: 6px; }
  .mana-button { width: 34px; height: 34px; }
  .changes-toggle { min-height: 32px; font-size: 13.5px; }
}
</style>
