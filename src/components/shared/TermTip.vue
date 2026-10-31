<template>
  <div v-if="tip && term" ref="el" class="term-tip" role="tooltip" :style="style">
    <div v-if="term.name" class="head">
      <img v-if="term.icon" :src="imgUrl('icons', term.icon)" alt="" />
      <strong :class="{ negative: term.negative }">{{ term.name }}</strong>
    </div>
    <RichText class="body" :tokens="term.desc" />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { imgUrl, resolveTerm, tip } from '../../store/codex.js'
import RichText from './RichText.vue'

const el = ref(null)
const style = ref({})
const term = computed(() => tip.value?.content ?? (tip.value ? resolveTerm(tip.value.ref) : null))

// Measure after render, then keep the tip inside the viewport.
watch(tip, async value => {
  if (!value) return
  style.value = { left: `${value.left}px`, top: `${value.bottom + 6}px`, visibility: 'hidden' }
  await nextTick()
  if (!el.value) return
  const { width, height } = el.value.getBoundingClientRect()
  const left = Math.max(8, Math.min(value.left, innerWidth - width - 8))
  const below = value.bottom + 6
  const top = below + height > innerHeight - 8 ? Math.max(8, value.top - height - 6) : below
  style.value = { left: `${left}px`, top: `${top}px` }
})
</script>

<style scoped>
.term-tip {
  position: fixed; z-index: 50; width: min(300px, calc(100vw - 16px)); padding: 10px 12px; border-radius: 8px;
  background: var(--surface-2); border: 1px solid var(--line); box-shadow: var(--shadow);
  font-size: 13px; line-height: 1.55; pointer-events: none;
}
.head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.head img { width: 24px; height: 24px; object-fit: contain; }
strong { color: var(--keyword); }
strong.negative { color: var(--negative); }
</style>
