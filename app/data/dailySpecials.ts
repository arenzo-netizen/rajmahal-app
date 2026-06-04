// Tagesangebote: 2 Gerichte pro Tag
// Werden im Admin-Panel gesetzt (app/admin) und in localStorage gespeichert.
// Fallback: feste Rotation nach Wochentag.

import { menu } from "./menu";

export interface DailySpecial {
  itemId: string;
  discountPercent?: number; // optionaler Rabatt
}

// Fallback-Rotation nach Wochentag (0=So, 1=Mo, …)
const fallbackByWeekday: Record<number, [string, string]> = {
  0: ["h570",   "veg602"],  // So
  1: ["h567",   "veg600"],  // Mo
  2: ["l580",   "veg607"],  // Di
  3: ["h569",   "van618"],  // Mi
  4: ["l587",   "veg605"],  // Do
  5: ["bir551", "veg603"],  // Fr
  6: ["h573",   "l584"],    // Sa
};

export function getDailySpecials(): DailySpecial[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("rajmahal_daily_specials");
      if (stored) {
        const parsed: DailySpecial[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 2) return parsed;
      }
    } catch { /* ignore */ }
  }
  const day = new Date().getDay();
  const ids = fallbackByWeekday[day] ?? ["h1", "veg1"];
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
