"use client";

const STORAGE_KEY = "vambla-wishlist";

function readWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWishlist(names: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
  // notify any listening components in this tab (storage event only fires
  // for OTHER tabs, so we dispatch our own for same-tab reactivity)
  window.dispatchEvent(new CustomEvent("vambla-wishlist-changed"));
}

export function isSaved(placeName: string): boolean {
  return readWishlist().includes(placeName);
}

export function toggleSaved(placeName: string): boolean {
  const current = readWishlist();
  const idx = current.indexOf(placeName);
  if (idx === -1) {
    writeWishlist([...current, placeName]);
    return true;
  } else {
    writeWishlist(current.filter((n) => n !== placeName));
    return false;
  }
}

export function getSavedNames(): string[] {
  return readWishlist();
}

/** React hook: re-renders whenever the wishlist changes in this tab. */
import { useEffect, useState } from "react";

export function useWishlist() {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    setNames(readWishlist());
    const handler = () => setNames(readWishlist());
    window.addEventListener("vambla-wishlist-changed", handler);
    return () => window.removeEventListener("vambla-wishlist-changed", handler);
  }, []);

  return names;
}
