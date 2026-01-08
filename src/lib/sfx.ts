// src/lib/sfx.ts
import clickUrl from "../assets/sfx/click.mp3";
import successUrl from "../assets/sfx/success.mp3";

const STORAGE_KEY = "ruletita.sfxMuted";

type SfxName = "click" | "success";

const VOLUME: Record<SfxName, number> = {
  click: 0.35,
  success: 0.45,
};

const URLS: Record<SfxName, string> = {
  click: clickUrl,
  success: successUrl,
};

const cache = new Map<SfxName, HTMLAudioElement>();

export function getSfxMuted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setSfxMuted(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
}

function getAudio(name: SfxName) {
  const cached = cache.get(name);
  if (cached) return cached;

  const audio = new Audio(URLS[name]);
  audio.preload = "auto";
  audio.volume = VOLUME[name];

  cache.set(name, audio);
  return audio;
}

export async function playSfx(name: SfxName) {
  if (getSfxMuted()) return;

  try {
    const audio = getAudio(name);
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // En algunos navegadores puede fallar si no hubo interacción previa.
    // No hacemos nada para no romper UX.
  }
}

export const sfx = {
  click: () => playSfx("click"),
  success: () => playSfx("success"),
};
