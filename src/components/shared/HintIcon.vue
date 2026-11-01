<template>
  <!-- prevent: inside a summary or label, this must not also toggle the panel or checkbox. -->
  <button
    type="button"
    class="hint-icon"
    :class="{ on: open }"
    :aria-label="label"
    :aria-expanded="open"
    @click.prevent="toggle"
  >?</button>
</template>

<script setup>
const props = defineProps({ open: { type: Boolean, required: true }, label: { type: String, required: true } })
const emit = defineEmits(['update:open'])

function toggle(e) {
  // The explanation sits inside the collapsible panel, so it needs that open to be seen.
  if (!props.open) e.currentTarget.closest('details')?.setAttribute('open', '')
  emit('update:open', !props.open)
}
</script>

<style scoped>
.hint-icon {
  display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-left: 5px; padding: 0;
  border: 1px solid var(--text-dim); border-radius: 50%; background: transparent; color: var(--text-dim);
  font-size: 10px; line-height: 1; cursor: pointer; vertical-align: 1px; position: relative;
}
/* A bigger target for fingers, without taking more room. */
@media (pointer: coarse) { .hint-icon::after { content: ""; position: absolute; inset: -12px; } }
.hint-icon:hover, .hint-icon:focus-visible, .hint-icon.on { border-color: var(--accent); color: var(--accent); }
</style>
