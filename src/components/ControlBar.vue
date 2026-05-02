<template>
  <div class="flex flex-row items-center gap-4 mt-4">
    <!-- Load ROM -->
    <button @click="romInput?.click()" title="Load ROM">
      <CpuChipIcon class="size-6" />
    </button>
    <input ref="romInput" type="file" accept=".bin,.rom" class="hidden" @change="onLoadROM" />

    <!-- Load Cart -->
    <button @click="cartInput?.click()" title="Load Cart">
      <DocumentPlusIcon class="size-6" />
    </button>
    <input ref="cartInput" type="file" accept=".bin,.cart" class="hidden" @change="onLoadCart" />

    <!-- Load Program -->
    <button @click="programInput?.click()" title="Load Program">
      <DocumentCurrencyDollarIcon class="size-6" />
    </button>
    <input ref="programInput" type="file" accept=".bin,.prg" class="hidden" @change="onLoadProgram" />

    <!-- Run / Stop toggle -->
    <button @click="toggleRun" :title="store.isRunning ? 'Stop' : 'Run'">
      <StopIcon v-if="store.isRunning" class="size-6" />
      <PlayIcon v-else class="size-6" />
    </button>

    <!-- Reset -->
    <button @click="store.reset()" title="Reset">
      <ArrowPathIcon class="size-6" />
    </button>

    <!-- Serial -->
    <button
      v-if="serialAvailable"
      @click="toggleSerial"
      :title="store.serialConnected ? 'Disconnect Serial' : 'Connect Serial'"
    >
      <LinkSlashIcon v-if="store.serialConnected" class="size-6" />
      <LinkIcon v-else class="size-6" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEmulatorStore } from '@/stores/emulator'
import { useAudio } from '@/composables/useAudio'
import { useWebSerial } from '@/composables/useWebSerial'
import {
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  CpuChipIcon,
  DocumentPlusIcon,
  DocumentCurrencyDollarIcon,
  LinkIcon,
  LinkSlashIcon,
} from '@heroicons/vue/24/solid'

const store = useEmulatorStore()
const { initAudio } = useAudio()
const { serialAvailable, connect, disconnect } = useWebSerial()

const romInput = ref<HTMLInputElement | null>(null)
const cartInput = ref<HTMLInputElement | null>(null)
const programInput = ref<HTMLInputElement | null>(null)

async function readFile(event: Event): Promise<Uint8Array | null> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return null
  const buffer = await file.arrayBuffer()
  input.value = '' // reset so same file can be re-selected
  return new Uint8Array(buffer)
}

async function onLoadROM(event: Event) {
  const data = await readFile(event)
  if (data) store.loadROM(data)
}

async function onLoadCart(event: Event) {
  const data = await readFile(event)
  if (data) store.loadCart(data)
}

async function onLoadProgram(event: Event) {
  const data = await readFile(event)
  if (data) store.loadProgram(data)
}

async function toggleRun() {
  await initAudio()
  if (store.isRunning) {
    store.stop()
  } else {
    store.run()
  }
}

async function toggleSerial() {
  if (store.serialConnected) {
    await disconnect()
  } else {
    await connect()
  }
}
</script>
