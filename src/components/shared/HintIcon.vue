<template>
  <button
    type="button"
    class="hint-icon"
    :aria-label="text"
    @click.prevent="show"
    @mouseenter="show"
    @mouseleave="hideTip"
    @focus="show"
    @blur="hideTip"
  >?</button>
</template>

<script setup>
import { hideTip, showHint } from '../../store/codex.js'

const props = defineProps({ text: { type: String, required: true } })
const show = e => showHint(props.text, e.currentTarget)
</script>

<style scoped>
.hint-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-left: 5px; padding: 0;
  border: 1px solid var(--text-dim); border-radius: 50%; background: transparent; color: var(--text-dim);
  font-size: 10px; line-height: 1; cursor: help; vertical-align: 1px; position: relative;
}
/* A bigger target for fingers, without taking more room. */
@media (pointer: coarse) { .hint-icon::after { content: ""; position: absolute; inset: -12px; } }
.hint-icon:hover, .hint-icon:focus-visible { border-color: var(--accent); color: var(--accent); }
</style>
