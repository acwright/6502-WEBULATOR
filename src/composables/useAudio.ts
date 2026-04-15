import { ref, onUnmounted } from 'vue'
import { useEmulatorStore } from '@/stores/emulator'

const SAMPLE_RATE = 44_100
const RING_BUFFER_CAPACITY = 8192

export function useAudio() {
  const emulator = useEmulatorStore()
  const audioReady = ref(false)

  let audioCtx: AudioContext | null = null
  let ringBuffer: SharedArrayBuffer | Float32Array | null = null
  let ringView: Float32Array | null = null
  let workletNode: AudioWorkletNode | null = null
  let scriptNode: ScriptProcessorNode | null = null

  // Fallback queue for ScriptProcessorNode
  let fallbackQueue: Float32Array[] = []
  let fallbackReadOffset = 0

  function pushSamples(samples: Float32Array) {
    if (ringView) {
      // Push into ring buffer for AudioWorklet path
      const cap = RING_BUFFER_CAPACITY
      let writeHead = ringView[0]! | 0
      for (let i = 0; i < samples.length; i++) {
        const nextWrite = (writeHead + 1) % cap
        const readHead = ringView[1]! | 0
        if (nextWrite === readHead) break // buffer full, drop samples
        ringView[2 + writeHead] = samples[i]!
        writeHead = nextWrite
      }
      ringView[0] = writeHead
    } else {
      // Fallback: enqueue for ScriptProcessorNode
      fallbackQueue.push(new Float32Array(samples))
    }
  }

  async function initWorklet(ctx: AudioContext): Promise<boolean> {
    try {
      await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}audio-worklet-processor.js`)

      const sab = new SharedArrayBuffer((RING_BUFFER_CAPACITY + 2) * Float32Array.BYTES_PER_ELEMENT)
      ringBuffer = sab
      ringView = new Float32Array(sab)
      ringView[0] = 0 // writeHead
      ringView[1] = 0 // readHead

      workletNode = new AudioWorkletNode(ctx, 'sample-player-processor', {
        processorOptions: {
          ringBuffer: sab,
          capacity: RING_BUFFER_CAPACITY,
        },
      })
      workletNode.connect(ctx.destination)
      return true
    } catch {
      return false
    }
  }

  function initScriptProcessor(ctx: AudioContext) {
    // Fallback for browsers without AudioWorklet or SharedArrayBuffer
    scriptNode = ctx.createScriptProcessor(2048, 0, 1)
    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0)
      let written = 0

      while (written < output.length && fallbackQueue.length > 0) {
        const chunk = fallbackQueue[0]!
        const remaining = chunk.length - fallbackReadOffset
        const toCopy = Math.min(remaining, output.length - written)
        output.set(chunk.subarray(fallbackReadOffset, fallbackReadOffset + toCopy), written)
        written += toCopy
        fallbackReadOffset += toCopy
        if (fallbackReadOffset >= chunk.length) {
          fallbackQueue.shift()
          fallbackReadOffset = 0
        }
      }

      // Fill remainder with silence
      for (let i = written; i < output.length; i++) {
        output[i] = 0
      }
    }
    scriptNode.connect(ctx.destination)
  }

  /** Must be called from a user gesture (click/keydown) to satisfy autoplay policy. */
  async function initAudio() {
    if (audioCtx) return

    audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }

    const workletOk = await initWorklet(audioCtx)
    if (!workletOk) {
      initScriptProcessor(audioCtx)
    }

    emulator.setPlayCallback(pushSamples)
    audioReady.value = true
  }

  function destroy() {
    workletNode?.disconnect()
    workletNode = null
    scriptNode?.disconnect()
    scriptNode = null
    audioCtx?.close()
    audioCtx = null
    ringView = null
    ringBuffer = null
    fallbackQueue = []
    fallbackReadOffset = 0
    audioReady.value = false
  }

  onUnmounted(destroy)

  return {
    audioReady,
    initAudio,
    destroy,
  }
}
