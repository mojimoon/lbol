<template>
  <!-- Drag down to dismiss the phone bottom sheet this is the first child of. Styled in app.css. -->
  <div
    class="sheet-handle"
    aria-hidden="true"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="cancel"
  ></div>
</template>

<script setup>
const emit = defineEmits(['close'])
const CLOSE_DISTANCE = 80
let startY = null
let distance = 0

const sheetOf = e => e.currentTarget.parentElement

function down(e) {
  startY = e.clientY
  distance = 0
  e.currentTarget.setPointerCapture(e.pointerId)
}
function move(e) {
  if (startY === null) return
  distance = Math.max(0, e.clientY - startY)
  sheetOf(e).style.transform = `translateY(${distance}px)`
}
function cancel(e) {
  startY = null
  sheetOf(e).style.transform = ''
}
function up(e) {
  cancel(e)
  if (distance > CLOSE_DISTANCE) emit('close')
}
</script>
