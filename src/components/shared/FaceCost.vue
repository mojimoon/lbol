<template>
  <span class="face-cost">
    <ManaCost :symbols="face.cost" size="22px" wrap />
    <!-- The coloured part of an X cost is only the minimum, and it counts towards X. -->
    <span class="total">({{ face.isX ? 'X' : face.total }})</span>
  </span>
</template>

<script setup>
import ManaCost from './ManaCost.vue'

defineProps({ face: { type: Object, required: true } })
</script>

<style scoped>
.face-cost { display: inline-flex; align-items: center; gap: 6px; }
.total { font-size: 13px; color: var(--text); font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
