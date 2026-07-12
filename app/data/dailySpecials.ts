// Tagesangebote: 4 Gerichte pro Tag
// Werden im Admin-Panel gesetzt (app/admin) und in localStorage gespeichert.
// Fallback: feste Rotation nach Wochentag.

import { menu } from "./menu";

export interface DailySpecial {
  itemId: string;
  customPrice?: number; // optionaler Sonderpreis (überschreibt Kartenpreis)
}

// Fallback-Rotation nach Wochentag (0=So, 1=Mo, …)
const fallbackByWeekday: Record<number, [string, string, string, string]> = {
  0: ["h570",   "veg602", "l580",   "bir551"],  // So
  1: ["h567",   "veg600", "h569",   "veg607"],  // Mo
  2: ["l580",   "veg607", "h573",   "veg603"],  // Di
  3: ["h569",   "van618", "h570",   "l587"],    // Mi
  4: ["l587",   "veg605", "bir551", "veg602"],  // Do
  5: ["bir551", "veg603", "h567",   "l584"],    // Fr
  6: ["h573",   "l584",   "veg600", "h569"],    // Sa
};

export function getDailySpecials(): DailySpecial[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("rajmahal_daily_specials");
      if (stored) {
        const parsed: DailySpecial[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 4 && parsed.every(p => p.itemId)) return parsed;
      }
    } catch { /* ignore */ }
  }
  const day = new Date().getDay();
  const ids = fallbackByWeekday[day] ?? ["h567", "veg600", "l580", "bir551"];
  return ids.map((id) => ({ itemId: id }));
}

export function saveDailySpecials(specials: DailySpecial[]): void {
  localStorage.setItem("rajmahal_daily_specials", JSON.stringify(specials));
}

export function getItemById(id: string) {
  for (const cat of menu) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}
