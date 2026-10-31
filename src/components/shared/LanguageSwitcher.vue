<template>
  <!-- Appears once a second language is added to pipeline/build.py. -->
  <label v-if="languages.length > 1" class="lang">
    <span class="sr-only">{{ t('lang.label') }}</span>
    <select v-model="lang">
      <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.name }}</option>
    </select>
  </label>
</template>

<script setup>
import { lang, languages, t } from '../../store/codex.js'
</script>

<style scoped>
select { padding: 5px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface-2); color: var(--text); }
</style>
