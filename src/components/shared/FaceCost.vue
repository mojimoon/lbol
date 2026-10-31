<template>
  <span class="face-cost">
    <ManaCost :symbols="face.cost" size="22px" wrap />
    <span class="total">({{ face.isX ? (face.total ? `X+${face.total}` : 'X') : face.total }})</span>
  </span>
</template>

<script setup>
import ManaCost from './ManaCost.vue'

defineProps({ face: { type: Object, required: true } })
</script>

<style scoped>
.face-cost { display: inline-flex; align-items: center; gap: 6px; }
.total { font-size: 13px; color: var(--text-dim); font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
