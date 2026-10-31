<template>
  <span class="mana-cost" :class="{ wrap }">
    <ManaIcon v-for="(s, i) in symbols" :key="i" :symbol="s" :size="size" />
  </span>
</template>

<script setup>
import ManaIcon from './ManaIcon.vue'

defineProps({
  symbols: { type: Array, required: true },
  size: { type: String, default: '20px' },
  wrap: { type: Boolean, default: false },
})
</script>

<style scoped>
.mana-cost { display: inline-flex; gap: 1px; flex: none; }
.mana-cost.wrap { flex-wrap: wrap; }
</style>
