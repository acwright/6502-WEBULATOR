import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { Machine, Storage, Video, RTC } from 'ac6502'

const PROGRAM_LOAD_ADDRESS = 0x0800
const CF_CARD_SIZE = 1024 * 1024 // 1MB

export const useEmulatorStore = defineStore('emulator', () => {
  const machine = shallowRef<Machine | null>(null)
  const isRunning = ref(false)
  const serialConnected = ref(false)

  // Callbacks set by composables
  let onRender: (() => void) | undefined
  let onTransmit: ((data: number) => void) | undefined
  let onPlay: ((samples: Float32Array) => void) | undefined

  function setRenderCallback(cb: () => void) {
    onRender = cb
    if (machine.value) machine.value.render = cb
  }

  function setTransmitCallback(cb: (data: number) => void) {
    onTransmit = cb
    if (machine.value) machine.value.transmit = cb
  }

  function setPlayCallback(cb: (samples: Float32Array) => void) {
    onPlay = cb
    if (machine.value) machine.value.play = cb
  }

  function init() {
    const m = new Machine()
    m.frequency = 1_000_000
    m.io4 = new Storage(CF_CARD_SIZE)

    m.render = onRender
    m.transmit = onTransmit
    m.play = onPlay

    machine.value = m
  }

  function loadROM(data: Uint8Array | ArrayBuffer) {
    machine.value?.loadROM(data instanceof ArrayBuffer ? new Uint8Array(data) : data)
  }

  function loadCart(data: Uint8Array | ArrayBuffer) {
    machine.value?.loadCart(data instanceof ArrayBuffer ? new Uint8Array(data) : data)
  }

  function loadProgram(data: Uint8Array | ArrayBuffer) {
    const m = machine.value
    if (!m) return
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data
    for (let i = 0; i < bytes.length; i++) {
      m.write(PROGRAM_LOAD_ADDRESS + i, bytes[i]!)
    }
  }

  function run() {
    machine.value?.run()
    isRunning.value = true
  }

  function stop() {
    machine.value?.stop()
    isRunning.value = false
  }

  function reset() {
    const wasRunning = isRunning.value
    if (wasRunning) stop()
    machine.value?.reset(true)
    if (wasRunning) run()
  }

  function getVideo(): Video | null {
    return (machine.value?.io8 as Video) ?? null
  }

  function getRTC(): RTC | null {
    return (machine.value?.io3 as RTC) ?? null
  }

  function getStorage(): Storage | null {
    return (machine.value?.io4 as Storage) ?? null
  }

  return {
    machine,
    isRunning,
    serialConnected,
    init,
    loadROM,
    loadCart,
    loadProgram,
    run,
    stop,
    reset,
    getVideo,
    getRTC,
    getStorage,
    setRenderCallback,
    setTransmitCallback,
    setPlayCallback,
  }
})
