import { findAll } from "./dom.js";
import type { Cleanup, Component, StartOptions } from "./types.js";

const components = new Map<string, Component>();
const setupCleanups = new Map<string, Cleanup>();
const cleanups = new WeakMap<HTMLElement, Map<string, Cleanup>>();

let observer: MutationObserver | undefined;
let observedRoot: (ParentNode & Node) | undefined;

export function register(component: Component): void {
  if (components.has(component.name)) return;
  components.set(component.name, component);

  const cleanup = component.setup?.();
  if (cleanup) setupCleanups.set(component.name, cleanup);

  if (observedRoot) mountComponent(observedRoot, component);
}

/** Mounts every registered component inside `root`. Safe to call repeatedly. */
export function mount(root: ParentNode = document): void {
  for (const component of components.values()) mountComponent(root, component);
}

/** Runs cleanups for every mounted component inside `root`. */
export function unmount(root: ParentNode): void {
  for (const component of components.values()) {
    for (const element of findAll(root, component.selector)) {
      unmountElement(element, component.name);
    }
  }
}

/** Scans `root` and keeps watching it, so htmx swaps mount automatically. */
export function start(options: StartOptions = {}): void {
  const root = options.root ?? document.body;
  if (observer) observer.disconnect();

  observedRoot = root;
  mount(root);

  observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node instanceof HTMLElement) unmount(node);
      }
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) mount(node);
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
}

export function stop(): void {
  observer?.disconnect();
  observer = undefined;
  observedRoot = undefined;
  for (const cleanup of setupCleanups.values()) cleanup();
  setupCleanups.clear();
  components.clear();
}

function mountComponent(root: ParentNode, component: Component): void {
  for (const element of findAll(root, component.selector)) {
    const byName = cleanups.get(element);
    if (byName?.has(component.name)) continue;

    const cleanup = component.mount(element);
    const map = byName ?? new Map<string, Cleanup>();
    map.set(component.name, cleanup ?? (() => {}));
    cleanups.set(element, map);
  }
}

function unmountElement(element: HTMLElement, name: string): void {
  const byName = cleanups.get(element);
  const cleanup = byName?.get(name);
  if (!cleanup || !byName) return;

  cleanup();
  byName.delete(name);
  if (byName.size === 0) cleanups.delete(element);
}
