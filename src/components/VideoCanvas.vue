<template>
  <canvas ref="canvasRef" width="320" height="240" :style="canvasStyle" class="rounded-lg" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEmulatorStore } from '@/stores/emulator'
import type { Video } from 'ac6502'

const emulator = useEmulatorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scale = ref(1)

let ctx: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null

const canvasStyle = computed(() => ({
  width: `${320 * scale.value}px`,
  height: `${240 * scale.value}px`,
  imageRendering: 'pixelated' as const,
}))

function updateScale(main: Element) {
  const mainW = main.clientWidth
  const mainH = main.clientHeight
  scale.value = Math.max(1, Math.floor(Math.min(mainW * 0.5 / 320, mainH * 0.5 / 240)))
}

function render() {
  if (!ctx) return
  const video = emulator.getVideo() as Video | null
  if (!video) return
  const buf = video.buffer
  const data = new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.byteLength), 320, 240)
  ctx.putImageData(data, 0, 0)
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null
  emulator.setRenderCallback(render)

  const main = canvasRef.value?.closest('main')
  if (main) {
    updateScale(main)
    resizeObserver = new ResizeObserver(() => updateScale(main))
    resizeObserver.observe(main)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>
