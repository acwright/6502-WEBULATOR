## Plan: 6502 Webulator SPA Implementation

Implement a single-page Vue 3 web app wrapping `ac6502`. A centered canvas renders TMS9918 video, dynamically sized to ~50% of the `<main>` area while retaining its native 4:3 aspect ratio (320×240). A control bar provides ROM/Cart/Program loading, run/stop/reset, and WebSerial. Frequency is always 1MHz. Audio via Web Audio API, persistence via localStorage, keyboard matrix wired by default.

---

### Phase 1: Pinia Store & Machine Lifecycle

1. **Populate `src/stores/emulator.ts`** — Create Machine instance, expose state (`isRunning`, `serialConnected`) and actions (`init`, `loadROM`, `loadCart`, `loadProgram`, `run`, `stop`, `reset`). Frequency is always 1MHz (no setter needed). Override `machine.io4` with `new Storage(1024 * 1024)` for 1MB CF card. Wire `render`, `transmit`, `play` callbacks. `loadProgram` writes bytes to RAM starting at `$0800`.

### Phase 2: Video Canvas

2. **Create `src/components/VideoCanvas.vue`** — Canvas at 320×240 internal resolution, CSS-scaled while retaining 4:3 aspect ratio. Use `ResizeObserver` on `<main>`: compute `scale = Math.floor(Math.min(mainW * 0.5 / 320, mainH * 0.5 / 240))` (minimum 1), then set CSS size to `320 * scale` × `240 * scale`. This ensures the canvas fills roughly half the available space but never distorts. Apply `image-rendering: pixelated` + `border-radius: 0.5rem`. Draw by converting `(machine.io8 as Video).buffer` to `ImageData` via `putImageData`.

### Phase 3: Audio

3. **Create `src/composables/useAudio.ts`** — `AudioContext` at 44100Hz. Ring buffer receives samples from `machine.play` callback. `AudioWorkletNode` pulls from ring buffer each audio frame. `ScriptProcessorNode` fallback. Must be initialized from a user gesture (autoplay policy).

### Phase 4: Keyboard

4. **Create `src/composables/useKeyboard.ts`** — Map `KeyboardEvent.code` → USB HID scancodes. Call `machine.onKeyDown`/`onKeyUp`. Prevent default on captured keys while running. Cleanup on unmount.

### Phase 5: Persistence

5. **Create `src/composables/usePersistence.ts`** — Save RTC NVRAM (`(io3 as RTC).ramData`, private `Uint8Array`, 256 bytes) and CF card storage (`(io4 as any).storage`, private `Uint8Array`, 1MB) to localStorage as base64. RAMBank io1/io2 data does **not** need persistence. ~1MB raw → ~1.3MB encoded, fits within 5MB limit. Triggers: stop, `beforeunload`, periodic (30s). Load on init before CPU reset.

### Phase 6: WebSerial

6. **Create `src/composables/useWebSerial.ts`** — `connect()` opens `navigator.serial.requestPort()` at 115200/8N1. Read loop feeds `machine.onReceive(byte)`. `machine.transmit` writes to serial port. Hide Serial button if API unavailable.

### Phase 7: UI Assembly

7. **Create `src/components/ControlBar.vue`** — White text, no background/shadow/border buttons. Buttons: Load ROM, Load Cart, Load Program, Run/Stop (toggle), Reset, Serial (connect/disconnect). No frequency picker — always 1MHz. Use Heroicons. Hidden file inputs triggered by buttons.

8. **Update `src/App.vue`** — Main: flexbox column, centered `<VideoCanvas>` + `<ControlBar>`. Init emulator in `onMounted`.

---

### Relevant Files

- `src/stores/emulator.ts` — Rewrite: Machine lifecycle, state, actions
- `src/App.vue` — Update: add components, wire init
- `src/components/VideoCanvas.vue` — **New**
- `src/components/ControlBar.vue` — **New**
- `src/composables/useAudio.ts` — **New**
- `src/composables/useWebSerial.ts` — **New**
- `src/composables/useKeyboard.ts` — **New**
- `src/composables/usePersistence.ts` — **New**

### Verification

1. `npm run type-check` passes
2. `npm run dev` → canvas renders (black until ROM loaded)
3. Load a ROM → video output appears, emulator runs
4. Load program → bytes visible at `$0800` in RAM
5. Resize window → canvas rescales maintaining 4:3 at ~50% of main
6. ROM with SID audio → sound plays
7. Press keys → matrix attachment receives correct scancodes
8. Serial button → Chrome port picker, bidirectional data flow
9. Run, modify NVRAM, refresh → data restored from localStorage
10. Run/Stop/Reset buttons function correctly

### Decisions

- **1MB CF card** (overriding 32MB default) — localStorage persistence feasible
- **Persistence:** RTC NVRAM (256 bytes) + CF card storage (1MB) only. RAMBank io1/io2 not persisted.
- **`(io3 as any).ramData`** and **`(io4 as any).storage`** for persistence (private fields, no public accessors)
- **Frequency:** always 1MHz, no UI for configuration
- **Program load address:** fixed `$0800`
- **Keyboard:** matrix by default, no config UI
- **Integer canvas scaling** for pixel-perfect 4:3 aspect ratio rendering

### Further Considerations

1. **Buffer polyfill** — `Video.buffer` is a Node.js `Buffer`. Need to verify `ac6502` browser build or add `buffer` polyfill / `vite-plugin-node-polyfills`.
2. **Machine loop performance** — Uses `setTimeout(0)` in browser. At 1MHz this should be fine.
3. **WebSerial baud rate** — Hardcoded 115200. Could be made configurable if needed.
