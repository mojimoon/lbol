<template>
  <p class="rich-text">
    <slot />
    <template v-for="(tok, i) in tokens" :key="i">
      <template v-if="typeof tok === 'string'">{{ tok }}</template>
      <span v-else-if="'n' in tok" class="num" :class="{ up: tok.up }">{{ tok.n }}</span>
      <ManaIcon v-else-if="'m' in tok" :symbol="tok.m" />
      <span v-else-if="'x' in tok" class="dyn" :title="t('rich.dynamic')">X</span>
      <img v-else-if="'f' in tok" class="friend" :src="imgUrl('mana', `friend_${tok.f}_${tok.c}`)" :alt="friendCost(tok)" />
      <TermButton v-else-if="interactive && tok.r" :text="tok.t" :term-ref="tok.r" />
      <span v-else class="term">{{ tok.t }}</span>
    </template>
  </p>
</template>

<script setup>
import { imgUrl, t } from '../../store/codex.js'
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
/* The game's own badges: green passive, blue active, orange ultimate. */
.friend { height: 1.5em; width: 3em; vertical-align: -.42em; margin: 0 .2em 0 -.15em; }
</style>
