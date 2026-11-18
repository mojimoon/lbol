<template>
  <span v-if="'n' in value" class="num">{{ value.n }}</span>
  <span v-else-if="difficulty == null" class="num"><template v-for="(v, i) in value.d" :key="i"><template v-if="i"> / </template><span :class="`diff-${KEYS[i]}`">{{ v }}</span></template></span>
  <span v-else class="num" :class="`diff-${KEYS[difficulty]}`" :title="value.d.join(' / ')">{{ value.d[difficulty] }}</span>
</template>

<script setup>
// A value that changes with difficulty, coloured per difficulty: N, H, L.
import { difficulty } from '../../store/codex.js'

defineProps({ value: { type: Object, required: true } })
const KEYS = ['N', 'H', 'L']
</script>

<style scoped>
.num { font-weight: 600; font-variant-numeric: tabular-nums; }
.diff-N { color: var(--diff-N); }
.diff-H { color: var(--diff-H); }
.diff-L { color: var(--diff-L); }
</style>
