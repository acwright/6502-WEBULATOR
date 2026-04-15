<template>
  <canvas
    ref="canvasRef"
    width="320"
    height="240"
    :style="{ width: cssWidth, height: cssHeight }"
    class="rounded-lg [image-rendering:pixelated]"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useEmulatorStore } from '@/stores/emulator'
import type { Video } from 'ac6502'

const NATIVE_W = 320
const NATIVE_H = 240
const ASPECT = NATIVE_W / NATIVE_H

const emulator = useEmulatorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const cssWidth = ref(`${NATIVE_W}px`)
const cssHeight = ref(`${NATIVE_H}px`)

let ctx: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null

function updateSize(main: Element) {
  const halfW = main.clientWidth * 0.5
  const halfH = main.clientHeight * 0.5

  let w: number, h: number
  if (halfW / halfH > ASPECT) {
    h = halfH
    w = h * ASPECT
  } else {
    w = halfW
    h = w / ASPECT
  }

  cssWidth.value = `${Math.round(w)}px`
  cssHeight.value = `${Math.round(h)}px`
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
    updateSize(main)
    resizeObserver = new ResizeObserver(() => updateSize(main))
    resizeObserver.observe(main)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>
