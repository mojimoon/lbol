<template>
  <aside ref="pane" class="detail-pane" :aria-label="selected.name">
    <SheetHandle @close="close" />
    <button class="close" type="button" :aria-label="t('detail.close')" @click="close">×</button>
    <component :is="detail" :key="selected.id" :entity="selected" />
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { navigate, route, selected, t } from '../../store/codex.js'
import SheetHandle from '../shared/SheetHandle.vue'
import { ENTITY_COMPONENTS } from '../entities/registry.js'

const pane = ref(null)
const detail = computed(() => ENTITY_COMPONENTS[route.tab].detail)
const close = () => navigate(route.tab)
// A related card opens in this same pane: start it from the top.
watch(() => route.id, () => pane.value?.scrollTo(0, 0))
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
/* The sticky handle takes the top edge; the button floats over the art instead of pushing it down. */
@media (max-width: 720px) {
  .detail-pane { padding: 0 16px 24px; }
  .close { top: 6px; margin-bottom: -32px; }
}
</style>
