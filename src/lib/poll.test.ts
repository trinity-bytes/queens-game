import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollWhileVisible } from "./poll";

function fakePage(hidden = false) {
  const listeners = new Set<() => void>();
  return {
    hidden,
    addEventListener: (_: "visibilitychange", listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: "visibilitychange", listener: () => void) =>
      listeners.delete(listener),
    setHidden(value: boolean) {
      this.hidden = value;
      listeners.forEach((listener) => listener());
    },
    listenerCount: () => listeners.size,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pollWhileVisible", () => {
  it("runs the task once per interval", () => {
    const task = vi.fn();
    pollWhileVisible(task, 30_000, fakePage());

    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(90_000);
    expect(task).toHaveBeenCalledTimes(3);
  });

  it("does nothing while the page is hidden", () => {
    const task = vi.fn();
    const page = fakePage();
    pollWhileVisible(task, 30_000, page);

    page.setHidden(true);
    vi.advanceTimersByTime(300_000);
    expect(task).not.toHaveBeenCalled();
  });

  it("does not start ticking on a page that opens hidden", () => {
    const task = vi.fn();
    pollWhileVisible(task, 30_000, fakePage(true));

    vi.advanceTimersByTime(300_000);
    expect(task).not.toHaveBeenCalled();
  });

  it("catches up at once when the page returns, then keeps ticking", () => {
    const task = vi.fn();
    const page = fakePage();
    pollWhileVisible(task, 30_000, page);

    page.setHidden(true);
    vi.advanceTimersByTime(300_000);
    page.setHidden(false);
    expect(task).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("stops completely when cancelled", () => {
    const task = vi.fn();
    const page = fakePage();
    const stop = pollWhileVisible(task, 30_000, page);

    stop();
    vi.advanceTimersByTime(300_000);
    page.setHidden(false);

    expect(task).not.toHaveBeenCalled();
    expect(page.listenerCount()).toBe(0);
  });
});
