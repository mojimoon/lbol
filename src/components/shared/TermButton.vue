<template>
  <button
    type="button"
    class="term-button"
    @mouseenter="show"
    @mouseleave="hideTip"
    @focus="show"
    @blur="hideTip"
    @click="open"
  >{{ text }}</button>
</template>

<script setup>
import { hideTip, navigate, resolveTerm, showTip } from '../../store/codex.js'

const props = defineProps({ text: { type: String, required: true }, termRef: { type: String, required: true } })
const show = e => showTip(props.termRef, e.currentTarget)
const open = e => {
  const term = resolveTerm(props.termRef)
  if (term?.tab) {
    hideTip()
    navigate(term.tab, term.id)
  } else {
    // A second tap: scrolling hid the tip, and a finger fires no new mouseenter or focus.
    show(e)
  }
}
</script>

<style scoped>
.term-button { all: unset; color: var(--keyword); cursor: help; border-bottom: 1px dotted currentColor; }
.term-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
</style>
