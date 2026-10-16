import { useEffect, type RefObject } from "react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { availableMonitors, getCurrentWindow } from "@tauri-apps/api/window";
import { resolvePosition } from "../utils/position";
import type { Settings } from "../services/storage/settings";

/** Keeps the transparent window exactly as large as the HUD content. */
export function useAutoSize(ref: RefObject<HTMLElement | null>, deps: unknown[]) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const win = getCurrentWindow();
    let last = "";
    const apply = () => {
      const r = el.getBoundingClientRect();
      const w = Math.ceil(r.width);
      const h = Math.ceil(r.height);
      const key = `${w}x${h}`;
      if (w > 0 && h > 0 && key !== last) {
        last = key;
        void win.setSize(new LogicalSize(w, h));
      }
    };
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Restores the saved position (monitor-aware) once, then persists moves. */
export function usePersistedPosition(
  ready: boolean,
  position: Settings["position"],
  save: (p: NonNullable<Settings["position"]>) => void,
) {
  useEffect(() => {
    if (!ready) return;
    const win = getCurrentWindow();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const monitors = (await availableMonitors()).map((m) => ({
        name: m.name ?? undefined,
        x: m.position.x,
        y: m.position.y,
        width: m.size.width,
        height: m.size.height,
      }));
      const size = await win.outerSize();
      const pos = resolvePosition(position, monitors, size);
      await win.setPosition(new PhysicalPosition(pos.x, pos.y));
      if (cancelled) return;

      unlisten = await win.onMoved(({ payload }) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const m = monitors.find(
            (mon) =>
              payload.x >= mon.x &&
              payload.x < mon.x + mon.width &&
              payload.y >= mon.y &&
              payload.y < mon.y + mon.height,
          );
          save({ monitor: m?.name, x: payload.x, y: payload.y });
        }, 400);
      });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unlisten?.();
    };
    // Position is restored only once when settings become ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
}
