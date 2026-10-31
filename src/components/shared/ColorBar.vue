<template>
  <div class="color-bar" :style="{ background }" aria-hidden="true"></div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ colors: { type: Array, required: true } })
const background = computed(() => {
  const stops = props.colors.length ? props.colors : ['C']
  if (stops.length === 1) return `var(--mana-${stops[0]})`
  return `linear-gradient(90deg, ${stops.map(c => `var(--mana-${c})`).join(', ')})`
})
</script>

<style scoped>
.color-bar { height: 4px; flex: none; }
</style>
