import { useEffect, type RefObject } from "react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { availableMonitors, currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { resolvePosition } from "../utils/position";
import type { Settings } from "../services/storage/settings";

/** Set while the app itself moves the window, so those moves are not saved as user positions. */
let programmaticMove = false;
/** Where the user left the HUD before it was nudged to fit on screen. */
let restoreTo: PhysicalPosition | null = null;

/**
 * When the window grows past the monitor edge (panel opened near a corner),
 * shift it just enough to stay visible; shift it back once it shrinks again.
 */
async function fitOnScreen(win: ReturnType<typeof getCurrentWindow>) {
  const [mon, pos, size] = await Promise.all([currentMonitor(), win.outerPosition(), win.outerSize()]);
  if (!mon) return;
  const maxX = mon.position.x + mon.size.width - size.width;
  const maxY = mon.position.y + mon.size.height - size.height;
  const x = Math.max(mon.position.x, Math.min(pos.x, maxX));
  const y = Math.max(mon.position.y, Math.min(pos.y, maxY));
  let target: PhysicalPosition | null = null;
  if (x !== pos.x || y !== pos.y) {
    restoreTo ??= new PhysicalPosition(pos.x, pos.y);
    target = new PhysicalPosition(x, y);
  } else if (restoreTo) {
    const fitsBack =
      restoreTo.x <= maxX && restoreTo.y <= maxY && restoreTo.x >= mon.position.x && restoreTo.y >= mon.position.y;
    if (fitsBack) {
      target = restoreTo;
      restoreTo = null;
    }
  }
  if (target) {
    programmaticMove = true;
    await win.setPosition(target);
    setTimeout(() => (programmaticMove = false), 700);
  }
}

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
        void win.setSize(new LogicalSize(w, h)).then(() => fitOnScreen(win));
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
        if (programmaticMove) return;
        restoreTo = null; // the user placed it: nothing to restore
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
