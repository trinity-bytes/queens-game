/** The slice of `document` polling needs, so it can run without a browser. */
export interface VisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: "visibilitychange", listener: () => void): void;
  removeEventListener(type: "visibilitychange", listener: () => void): void;
}

/**
 * Runs `task` every `intervalMs` while the page is visible. A hidden tab does
 * no work at all, and catches up the moment it comes back. Returns the function
 * that stops it.
 */
export function pollWhileVisible(
  task: () => void,
  intervalMs: number,
  page: VisibilitySource = document,
): () => void {
  let timer: ReturnType<typeof setInterval> | undefined;

  const pause = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const resume = () => {
    timer = setInterval(task, intervalMs);
  };

  const onVisibilityChange = () => {
    pause();
    if (page.hidden) return;
    task();
    resume();
  };

  if (!page.hidden) resume();
  page.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    pause();
    page.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
