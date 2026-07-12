// Mittagsangebot · Mo–Fr · 10:30–14:00 Uhr (Europe/Berlin)
// Konfiguration via Admin-Panel → localStorage

export const LUNCH_DAYS = [1, 2, 3, 4, 5]; // Mo–Fr

export interface LunchCategoryConfig {
  enabled: boolean;
  price: number;
}

export interface LunchConfig {
  vegetarisch: LunchCategoryConfig;
  vegan: LunchCategoryConfig;
  haehnchen: LunchCategoryConfig;
}

export const DEFAULT_LUNCH_CONFIG: LunchConfig = {
  vegetarisch: { enabled: true, price: 9.50 },
  vegan:       { enabled: true, price: 8.50 },
  haehnchen:   { enabled: true, price: 9.50 },
};

/** Prüft ob aktuell Mittagszeit ist (10:30–14:00, Mo–Fr, Europe/Berlin) */
export function isLunchTime(): boolean {
  try {
    const now = new Date();
    // Berliner Uhrzeit via Locale-String-Trick (clientseitig sicher)
    const berlinStr = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
    const berlin = new Date(berlinStr);
    const day = berlin.getDay();
    const totalMins = berlin.getHours() * 60 + berlin.getMinutes();
    return LUNCH_DAYS.includes(day) && totalMins >= 10 * 60 + 30 && totalMins < 14 * 60;
  } catch {
    // Fallback ohne Timezone-Support
    const now = new Date();
    const day = now.getDay();
    const totalMins = now.getHours() * 60 + now.getMinutes();
    return LUNCH_DAYS.includes(day) && totalMins >= 10 * 60 + 30 && totalMins < 14 * 60;
  }
}

export function getLunchConfig(): LunchConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("rajmahal_lunch_config");
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LunchConfig>;
        return {
          vegetarisch: { ...DEFAULT_LUNCH_CONFIG.vegetarisch, ...parsed.vegetarisch },
          vegan:       { ...DEFAULT_LUNCH_CONFIG.vegan,       ...parsed.vegan },
          haehnchen:   { ...DEFAULT_LUNCH_CONFIG.haehnchen,   ...parsed.haehnchen },
        };
      }
    } catch { /* ignore */ }
  }
  return { ...DEFAULT_LUNCH_CONFIG };
}

export function saveLunchConfig(config: LunchConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("rajmahal_lunch_config", JSON.stringify(config));
  }
}

// Welche Menü-Kategorien erscheinen im Mittagsangebot
export const LUNCH_VEG_CAT_IDS    = ["biryani", "vegetables"];
export const LUNCH_VEGAN_CAT_IDS  = ["biryani", "vegetables", "vegan"];
export const LUNCH_CHICKEN_CAT_ID = "huhn";
