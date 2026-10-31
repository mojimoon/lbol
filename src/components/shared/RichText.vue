<template>
  <p class="rich-text">
    <template v-for="(tok, i) in tokens" :key="i">
      <template v-if="typeof tok === 'string'">{{ tok }}</template>
      <span v-else-if="'n' in tok" class="num" :class="{ up: tok.up }">{{ tok.n }}</span>
      <ManaIcon v-else-if="'m' in tok" :symbol="tok.m" />
      <span v-else-if="'x' in tok" class="dyn" :title="t('rich.dynamic')">X</span>
      <span v-else-if="'f' in tok" class="friend" :class="`friend-${tok.f}`">{{ friendCost(tok) }}</span>
      <TermButton v-else-if="interactive && tok.r" :text="tok.t" :term-ref="tok.r" />
      <span v-else class="term">{{ tok.t }}</span>
    </template>
  </p>
</template>

<script setup>
import { t } from '../../store/codex.js'
import ManaIcon from './ManaIcon.vue'
import TermButton from './TermButton.vue'

defineProps({
  tokens: { type: Array, required: true },
  // Tiles sit inside a link, where nested interactive elements are invalid.
  interactive: { type: Boolean, default: false },
})
const friendCost = tok => (tok.c > 0 ? `+${tok.c}` : `${tok.c}`)
</script>

<style scoped>
.rich-text { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
.num { font-weight: 600; font-variant-numeric: tabular-nums; }
.num.up { color: var(--up); }
.dyn { font-weight: 600; color: var(--accent); cursor: help; }
.term { color: var(--keyword); }
.friend {
  display: inline-block; min-width: 2em; margin-right: .3em; padding: 0 .35em; border-radius: 4px; text-align: center;
  font-size: .9em; font-weight: 600; background: var(--surface-2); border: 1px solid var(--line);
}
.friend-Passive { color: var(--up); }
.friend-Ultimate { color: var(--rarity-rare); }
</style>
