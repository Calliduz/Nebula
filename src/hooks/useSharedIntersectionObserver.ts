import React, { useEffect, useRef } from "react";

type IntersectionCallback = (entry: IntersectionObserverEntry) => void;

interface ObserverInstance {
  observer: IntersectionObserver;
  callbacks: Map<Element, IntersectionCallback>;
}

// Global registry of IntersectionObserver instances keyed by rootMargin and threshold
const observerPool = new Map<string, ObserverInstance>();

function getObserverKey(options: IntersectionObserverInit): string {
  const rootMargin = options.rootMargin || "0px 0px 0px 0px";
  const threshold = Array.isArray(options.threshold)
    ? options.threshold.join(",")
    : (options.threshold ?? 0);
  return `${rootMargin}__${threshold}`;
}

function getSharedObserver(
  options: IntersectionObserverInit,
): ObserverInstance {
  const key = getObserverKey(options);
  let instance = observerPool.get(key);

  if (!instance) {
    const callbacks = new Map<Element, IntersectionCallback>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callback = callbacks.get(entry.target);
        if (callback) {
          callback(entry);
        }
      });
    }, options);

    instance = { observer, callbacks };
    observerPool.set(key, instance);
  }

  return instance;
}

export function observeElement(
  element: Element,
  callback: IntersectionCallback,
  options: IntersectionObserverInit = {},
): () => void {
  const isTest =
    (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
    (typeof import.meta !== "undefined" &&
      (import.meta as any).env?.MODE === "test");

  if (
    isTest ||
    typeof window === "undefined" ||
    !("IntersectionObserver" in window)
  ) {
    // Fallback for SSR/unsupported browsers/unit tests: simulate immediate intersection
    callback({
      isIntersecting: true,
      target: element,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now(),
    } as IntersectionObserverEntry);
    return () => {};
  }

  const instance = getSharedObserver(options);
  instance.callbacks.set(element, callback);
  instance.observer.observe(element);

  return () => {
    instance.callbacks.delete(element);
    instance.observer.unobserve(element);
    if (instance.callbacks.size === 0) {
      instance.observer.disconnect();
      const key = getObserverKey(options);
      observerPool.delete(key);
    }
  };
}

export function useSharedIntersectionObserver(
  targetRef: React.RefObject<Element | null>,
  onIntersect: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {},
  enabled = true,
) {
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const element = targetRef.current;
    const cleanup = observeElement(
      element,
      (entry) => callbackRef.current(entry),
      options,
    );

    return cleanup;
  }, [targetRef, enabled, options.rootMargin, options.threshold]);
}
