// Mittagsangebot – Konfiguration via Admin-Panel → localStorage

export interface LunchCategoryConfig {
  enabled: boolean;
  price: number;
  itemId: string; // ausgewähltes Gericht (ID aus dem Hauptmenü)
}

export interface LunchConfig {
  vegetarisch: LunchCategoryConfig;
  vegan:       LunchCategoryConfig;
  haehnchen:   LunchCategoryConfig;
  startTime: string;  // "HH:MM"
  endTime:   string;  // "HH:MM"
  days: number[];     // 0=So 1=Mo 2=Di 3=Mi 4=Do 5=Fr 6=Sa
}

export const DEFAULT_LUNCH_CONFIG: LunchConfig = {
  vegetarisch: { enabled: true, price: 9.50, itemId: "" },
  vegan:       { enabled: true, price: 8.50, itemId: "" },
  haehnchen:   { enabled: true, price: 9.50, itemId: "" },
  startTime: "10:30",
  endTime:   "14:00",
  days: [1, 2, 3, 4, 5], // Mo–Fr
};

/** Prüft ob aktuell Mittagszeit ist (nutzt gespeicherte Konfiguration) */
export function isLunchTime(config?: LunchConfig): boolean {
  const cfg = config ?? DEFAULT_LUNCH_CONFIG;
  try {
    const now = new Date();
    const berlinStr = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
    const berlin = new Date(berlinStr);
    const day = berlin.getDay();
    const totalMins = berlin.getHours() * 60 + berlin.getMinutes();
    const [sh, sm] = cfg.startTime.split(":").map(Number);
    const [eh, em] = cfg.endTime.split(":").map(Number);
    return cfg.days.includes(day) && totalMins >= sh * 60 + sm && totalMins < eh * 60 + em;
  } catch {
    const now = new Date();
    return cfg.days.includes(now.getDay());
  }
}

export function getLunchConfig(): LunchConfig {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("rajmahal_lunch_config");
      if (stored) {
        const p = JSON.parse(stored) as Partial<LunchConfig>;
        return {
          vegetarisch: { ...DEFAULT_LUNCH_CONFIG.vegetarisch, ...p.vegetarisch },
          vegan:       { ...DEFAULT_LUNCH_CONFIG.vegan,       ...p.vegan },
          haehnchen:   { ...DEFAULT_LUNCH_CONFIG.haehnchen,   ...p.haehnchen },
          startTime: p.startTime ?? DEFAULT_LUNCH_CONFIG.startTime,
          endTime:   p.endTime   ?? DEFAULT_LUNCH_CONFIG.endTime,
          days:      p.days      ?? DEFAULT_LUNCH_CONFIG.days,
        };
      }
    } catch { /* ignore */ }
  }
  return structuredClone ? structuredClone(DEFAULT_LUNCH_CONFIG) : JSON.parse(JSON.stringify(DEFAULT_LUNCH_CONFIG));
}

export function saveLunchConfig(config: LunchConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("rajmahal_lunch_config", JSON.stringify(config));
  }
}

// Menü-Kategorien für die Dropdown-Filter im Admin
export const LUNCH_VEG_CAT_IDS    = ["biryani", "vegetables"];
export const LUNCH_VEGAN_CAT_IDS  = ["biryani", "vegetables", "vegan"];
export const LUNCH_CHICKEN_CAT_ID = "huhn";
