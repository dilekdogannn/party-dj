"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RoomView } from "./types";

const GUEST_KEY = "party-dj:guest";
const NAME_KEY = "party-dj:name";
export const hostKey = (code: string) => `party-dj:host:${code}`;

const storeListeners = new Set<() => void>();

function subscribeToStore(listener: () => void) {
  storeListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    storeListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage can be blocked (private mode); the app still works for this tab.
    return null;
  }
}

export function setStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  for (const listener of storeListeners) listener();
}

/** A localStorage value that re-renders when it changes. `null` on the server and when unset. */
export function useStored(key: string): string | null {
  return useSyncExternalStore(
    subscribeToStore,
    () => readStored(key),
    () => null,
  );
}

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}

let fallbackGuestId: string | null = null;

function getGuestId(): string {
  const saved = readStored(GUEST_KEY);
  if (saved) return saved;

  // crypto.randomUUID only exists on HTTPS and localhost; guests on the same
  // Wi-Fi join over plain HTTP, where getRandomValues is still available.
  if (!fallbackGuestId) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    fallbackGuestId = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(GUEST_KEY, fallbackGuestId);
    } catch {}
  }
  return fallbackGuestId;
}

/** A random id that identifies this browser, so each guest gets one vote per track. */
export function useGuestId(): string | null {
  return useSyncExternalStore(noopSubscribe, getGuestId, () => null);
}

export function useGuestName(): [string, (name: string) => void] {
  return [useStored(NAME_KEY) ?? "", (name) => setStored(NAME_KEY, name)];
}

export async function postJson<T = unknown>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong");
  return data as T;
}

/** Live room state over Server-Sent Events. */
export function useRoom(code: string, guestId: string | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!guestId) return;

    const source = new EventSource(`/api/rooms/${code}/events?guest=${guestId}`);
    source.onmessage = (event) => setRoom(JSON.parse(event.data));
    source.onerror = () => {
      // EventSource reconnects by itself after a network blip. Only give up
      // when the server says the room is really gone.
      fetch(`/api/rooms/${code}`)
        .then((response) => {
          if (response.status === 404) {
            setMissing(true);
            source.close();
          }
        })
        .catch(() => {});
    };
    return () => source.close();
  }, [code, guestId]);

  return { room, missing };
}
