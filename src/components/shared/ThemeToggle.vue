<template>
  <button class="theme-toggle" type="button" :aria-label="label" :title="label" @click="isDark = !isDark">
    {{ isDark ? '☾' : '☀' }}
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { isDark, t } from '../../store/codex.js'

const label = computed(() => t(isDark.value ? 'theme.toLight' : 'theme.toDark'))
</script>

<style scoped>
.theme-toggle {
  width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--line);
  background: transparent; color: var(--text); font-size: 16px; cursor: pointer;
}
.theme-toggle:hover { background: var(--hover); }
</style>
