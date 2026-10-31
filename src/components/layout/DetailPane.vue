<template>
  <aside class="detail-pane" :aria-label="selected.name">
    <button class="close" type="button" :aria-label="t('detail.close')" @click="close">×</button>
    <component :is="detail" :key="selected.id" :entity="selected" />
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { navigate, route, selected, t } from '../../store/codex.js'
import { ENTITY_COMPONENTS } from '../entities/registry.js'

const detail = computed(() => ENTITY_COMPONENTS[route.tab].detail)
const close = () => navigate(route.tab)
const onKey = e => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.detail-pane { padding: 16px 20px 24px; }
.close {
  position: sticky; top: 0; display: block; margin-left: auto; margin-bottom: 8px; z-index: 2; width: 32px; height: 32px;
  border: 1px solid var(--line); border-radius: 50%; background: var(--surface-2); color: var(--text);
  font-size: 18px; line-height: 1; cursor: pointer;
}
.close:hover { background: var(--hover); }
</style>
