import { onUnmounted } from 'vue'
import { useEmulatorStore } from '@/stores/emulator'

const LS_KEY_NVRAM = '6502-webulator-nvram'
const LS_KEY_CF = '6502-webulator-cf'
const SAVE_INTERVAL_MS = 30_000

function toBase64(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!)
  }
  return btoa(binary)
}

function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function usePersistence() {
  const store = useEmulatorStore()
  let intervalId: ReturnType<typeof setInterval> | null = null

  function save() {
    const rtc = store.getRTC()
    const storage = store.getStorage()

    if (rtc) {
      try {
        localStorage.setItem(LS_KEY_NVRAM, toBase64(rtc.getNVRAM()))
      } catch { /* localStorage full or unavailable */ }
    }

    if (storage) {
      try {
        localStorage.setItem(LS_KEY_CF, toBase64(storage.getData()))
      } catch { /* localStorage full or unavailable */ }
    }
  }

  function load() {
    const rtc = store.getRTC()
    const storage = store.getStorage()

    const nvramData = localStorage.getItem(LS_KEY_NVRAM)
    if (nvramData && rtc) {
      try {
        rtc.loadNVRAM(fromBase64(nvramData))
      } catch { /* corrupt data, ignore */ }
    }

    const cfData = localStorage.getItem(LS_KEY_CF)
    if (cfData && storage) {
      try {
        storage.loadData(fromBase64(cfData))
      } catch { /* corrupt data, ignore */ }
    }
  }

  function onBeforeUnload() {
    save()
  }

  function start() {
    load()
    window.addEventListener('beforeunload', onBeforeUnload)
    intervalId = setInterval(save, SAVE_INTERVAL_MS)
  }

  function stop() {
    save()
  }

  function cleanup() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    window.removeEventListener('beforeunload', onBeforeUnload)
  }

  onUnmounted(cleanup)

  return { save, load, start, stop }
}
