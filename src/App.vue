<template>
  <p v-if="loadError" class="app-message" role="alert">{{ t('app.loadError') }}</p>
  <p v-else-if="!data" class="app-message">…</p>
  <template v-else>
    <AppHeader />
    <CollectionView />
    <TermTip />
  </template>
</template>

<script setup>
import { onMounted } from 'vue'
import AppHeader from './components/layout/AppHeader.vue'
import CollectionView from './components/layout/CollectionView.vue'
import TermTip from './components/shared/TermTip.vue'
import { data, initCodex, loadError, t } from './store/codex.js'

onMounted(initCodex)
</script>
