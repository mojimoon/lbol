<template>
  <img class="mana-icon" :src="imgUrl('mana', symbol)" :alt="label ?? symbol" :style="{ '--size': size }" />
</template>

<script setup>
import { imgUrl } from '../../store/codex.js'

defineProps({
  symbol: { type: String, required: true },
  label: { type: String, default: null },
  size: { type: String, default: '1.25em' },
})
</script>

<style scoped>
.mana-icon { width: var(--size); height: var(--size); vertical-align: -.25em; display: inline-block; object-fit: contain; }
</style>
