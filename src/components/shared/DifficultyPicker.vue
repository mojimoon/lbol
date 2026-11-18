<template>
  <div class="difficulty" role="radiogroup" :aria-label="t('enemy.difficulty')">
    <span class="label">{{ t('enemy.difficulty') }}</span>
    <button
      v-for="option in OPTIONS" :key="String(option.value)" type="button" role="radio"
      :aria-checked="difficulty === option.value"
      :title="option.value == null ? null : t(`diff.${option.key}`)"
      @click="difficulty = option.value"
      :class="[{ on: difficulty === option.value }, option.key && `diff-${option.key}`]"
    >{{ option.value == null ? t('diff.all') : option.key }}</button>
  </div>
</template>

<script setup>
import { difficulty, t } from '../../store/codex.js'

const OPTIONS = [{ value: null }, { value: 0, key: 'N' }, { value: 1, key: 'H' }, { value: 2, key: 'L' }]
</script>

<style scoped>
.difficulty { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.label { margin-right: 4px; color: var(--text-dim); font-size: 12.5px; }
/* Fixed height: CJK and Latin labels have different line boxes. */
button {
  display: inline-flex; align-items: center; justify-content: center; height: 24px; line-height: 1;
  min-width: 30px; padding: 0 8px; border: 1px solid var(--line); border-radius: 6px;
  background: transparent; color: var(--text); font-size: 13px; cursor: pointer;
}
.diff-N { color: var(--diff-N); font-weight: 600; }
.diff-H { color: var(--diff-H); font-weight: 600; }
.diff-L { color: var(--diff-L); font-weight: 600; }
button.on { border-color: var(--accent); background: var(--selected); box-shadow: inset 0 0 0 1px var(--accent); }
@media (hover: hover) { button:hover { background: var(--hover); } }
@media (pointer: coarse) { button { height: 32px; min-width: 38px; } }
</style>
