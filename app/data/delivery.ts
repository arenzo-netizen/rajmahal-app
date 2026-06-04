// ─────────────────────────────────────────────────────────────────────────────
// Liefergebiete – Rajmahal Schkeuditz (identisch Nova Pizza)
// K.L. = Kostenlose Lieferung ab Mindestbestellwert
// Unterhalb des Mindestbestellwerts ist keine Lieferung möglich.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeliveryZone {
  id: string;
  plz: string;
  city: string;      // Hauptstadt / Gemeinde
  ortsteil: string;  // Ortsteil (DE)
  ortsteilEn: string;
  minOrder: number;  // Mindestbestellwert für kostenlose Lieferung
  fee: number;       // immer 0 (kostenlos ab minOrder)
}

export const deliveryZones: DeliveryZone[] = [
  // 04158 Leipzig
  { id: "04158-lindenthal",   plz: "04158", city: "Leipzig", ortsteil: "Lindenthal",            ortsteilEn: "Lindenthal",            minOrder: 20, fee: 0 },
  { id: "04158-tannenwald",   plz: "04158", city: "Leipzig", ortsteil: "Tannenwald",             ortsteilEn: "Tannenwald",            minOrder: 15, fee: 0 },
  { id: "04158-breitenfeld",  plz: "04158", city: "Leipzig", ortsteil: "Breitenfeld",            ortsteilEn: "Breitenfeld",           minOrder: 25, fee: 0 },
  { id: "04158-wiederitzsch", plz: "04158", city: "Leipzig", ortsteil: "Wiederitzsch",           ortsteilEn: "Wiederitzsch",          minOrder: 25, fee: 0 },

  // 04159 Leipzig
  { id: "04159-luetzschena",  plz: "04159", city: "Leipzig", ortsteil: "Lützschena",             ortsteilEn: "Lützschena",            minOrder: 10, fee: 0 },
  { id: "04159-wahren",       plz: "04159", city: "Leipzig", ortsteil: "Wahren",                 ortsteilEn: "Wahren",                minOrder: 12, fee: 0 },
  { id: "04159-stahmeln",     plz: "04159", city: "Leipzig", ortsteil: "Stahmeln",               ortsteilEn: "Stahmeln",              minOrder: 12, fee: 0 },
  { id: "04159-moeckern",     plz: "04159", city: "Leipzig", ortsteil: "Möckern",                ortsteilEn: "Möckern",               minOrder: 15, fee: 0 },

  // 04178 Leipzig
  { id: "04178-burghausen",   plz: "04178", city: "Leipzig", ortsteil: "Burghausen-Rückmarsdorf",ortsteilEn: "Burghausen-Rückmarsdorf",minOrder: 25, fee: 0 },
  { id: "04178-boehlitz",     plz: "04178", city: "Leipzig", ortsteil: "Böhlitz-Ehrenberg",      ortsteilEn: "Böhlitz-Ehrenberg",     minOrder: 25, fee: 0 },

  // 04205 Leipzig
  { id: "04205-miltitz",      plz: "04205", city: "Leipzig", ortsteil: "Miltitz",                ortsteilEn: "Miltitz",               minOrder: 35, fee: 0 },

  // 04420 Markranstädt
  { id: "04420-markranstaedt",plz: "04420", city: "Markranstädt", ortsteil: "Markranstädt",      ortsteilEn: "Markranstädt",          minOrder: 40, fee: 0 },
  { id: "04420-altranstaedt", plz: "04420", city: "Markranstädt", ortsteil: "Altranstädt",       ortsteilEn: "Altranstädt",           minOrder: 40, fee: 0 },
  { id: "04420-priestebelich",plz: "04420", city: "Markranstädt", ortsteil: "Priestebelich",     ortsteilEn: "Priestebelich",         minOrder: 30, fee: 0 },
  { id: "04420-frankenheim",  plz: "04420", city: "Markranstädt", ortsteil: "Frankenheim / Lindennaundorf", ortsteilEn: "Frankenheim / Lindennaundorf", minOrder: 25, fee: 0 },
  { id: "04420-kleinlehna",   plz: "04420", city: "Markranstädt", ortsteil: "Kleinlehna",        ortsteilEn: "Kleinlehna",            minOrder: 40, fee: 0 },
  { id: "04420-grosslehna",   plz: "04420", city: "Markranstädt", ortsteil: "Großlehna",         ortsteilEn: "Großlehna",             minOrder: 40, fee: 0 },

  // 04435 Schkeuditz
  { id: "04435-schkeuditz",   plz: "04435", city: "Schkeuditz", ortsteil: "Schkeuditz",          ortsteilEn: "Schkeuditz",            minOrder: 10, fee: 0 },
  { id: "04435-kursdorf",     plz: "04435", city: "Schkeuditz", ortsteil: "Kursdorf",            ortsteilEn: "Kursdorf",              minOrder: 15, fee: 0 },
  { id: "04435-doelzig",      plz: "04435", city: "Schkeuditz", ortsteil: "Dölzig",              ortsteilEn: "Dölzig",                minOrder: 15, fee: 0 },
  { id: "04435-freiroda",     plz: "04435", city: "Schkeuditz", ortsteil: "Freiroda",            ortsteilEn: "Freiroda",              minOrder: 20, fee: 0 },
  { id: "04435-glesien",      plz: "04435", city: "Schkeuditz", ortsteil: "Glesien",             ortsteilEn: "Glesien",               minOrder: 30, fee: 0 },
  { id: "04435-radefeld",     plz: "04435", city: "Schkeuditz", ortsteil: "Radefeld",            ortsteilEn: "Radefeld",              minOrder: 20, fee: 0 },
  { id: "04435-hayna",        plz: "04435", city: "Schkeuditz", ortsteil: "Hayna",               ortsteilEn: "Hayna",                 minOrder: 20, fee: 0 },
  { id: "04435-gerbisdorf",   plz: "04435", city: "Schkeuditz", ortsteil: "Gerbisdorf",          ortsteilEn: "Gerbisdorf",            minOrder: 20, fee: 0 },
  { id: "04435-wolteritz",    plz: "04435", city: "Schkeuditz", ortsteil: "Wolteritz",           ortsteilEn: "Wolteritz",             minOrder: 25, fee: 0 },
  { id: "04435-kleinliebenau",plz: "04435", city: "Schkeuditz", ortsteil: "Kleinliebenau",       ortsteilEn: "Kleinliebenau",         minOrder: 20, fee: 0 },

  // 04509 Wiedemar
  { id: "04509-wiedemar",     plz: "04509", city: "Wiedemar", ortsteil: "Wiedemar",              ortsteilEn: "Wiedemar",              minOrder: 30, fee: 0 },
  { id: "04509-koelsa",       plz: "04509", city: "Wiedemar", ortsteil: "Kölsa",                 ortsteilEn: "Kölsa",                 minOrder: 35, fee: 0 },
  { id: "04509-wiesenena",    plz: "04509", city: "Wiedemar", ortsteil: "Wiesenena",             ortsteilEn: "Wiesenena",             minOrder: 30, fee: 0 },
  { id: "04509-werlitzsch",   plz: "04509", city: "Wiedemar", ortsteil: "Werlitzsch",            ortsteilEn: "Werlitzsch",            minOrder: 30, fee: 0 },
  { id: "04509-zwochau",      plz: "04509", city: "Wiedemar", ortsteil: "Zwochau",               ortsteilEn: "Zwochau",               minOrder: 30, fee: 0 },
  { id: "04509-klitschmar",   plz: "04509", city: "Wiedemar", ortsteil: "Klitschmar",            ortsteilEn: "Klitschmar",            minOrder: 35, fee: 0 },
  { id: "04509-lissa",        plz: "04509", city: "Wiedemar", ortsteil: "Lissa",                 ortsteilEn: "Lissa",                 minOrder: 35, fee: 0 },

  // 06184 Kabelsketal
  { id: "06184-grosskugel",   plz: "06184", city: "Kabelsketal", ortsteil: "Großkugel",          ortsteilEn: "Großkugel",             minOrder: 15, fee: 0 },
  { id: "06184-osmuende",     plz: "06184", city: "Kabelsketal", ortsteil: "Osmünde",            ortsteilEn: "Osmünde",               minOrder: 30, fee: 0 },
  { id: "06184-groebers",     plz: "06184", city: "Kabelsketal", ortsteil: "Gröbers",            ortsteilEn: "Gröbers",               minOrder: 25, fee: 0 },

  // 06237 Leuna
  { id: "06237-moeritzsch",   plz: "06237", city: "Leuna", ortsteil: "Möritzsch",               ortsteilEn: "Möritzsch",             minOrder: 20, fee: 0 },
  { id: "06237-pissen",       plz: "06237", city: "Leuna", ortsteil: "Pissen",                  ortsteilEn: "Pissen",                minOrder: 25, fee: 0 },
  { id: "06237-zscherneddel", plz: "06237", city: "Leuna", ortsteil: "Zscherneddel",            ortsteilEn: "Zscherneddel",          minOrder: 20, fee: 0 },
  { id: "06237-witzschersdorf",plz:"06237", city: "Leuna", ortsteil: "Witzschersdorf",          ortsteilEn: "Witzschersdorf",        minOrder: 25, fee: 0 },
  { id: "06237-schladebach",  plz: "06237", city: "Leuna", ortsteil: "Schladebach",             ortsteilEn: "Schladebach",           minOrder: 35, fee: 0 },
  { id: "06237-zweimen",      plz: "06237", city: "Leuna", ortsteil: "Zweimen",                 ortsteilEn: "Zweimen",               minOrder: 30, fee: 0 },
  { id: "06237-koetschlitz",  plz: "06237", city: "Leuna", ortsteil: "Kötschlitz",             ortsteilEn: "Kötschlitz",            minOrder: 20, fee: 0 },
  { id: "06237-guenthersdorf",plz: "06237", city: "Leuna", ortsteil: "Günthersdorf",            ortsteilEn: "Günthersdorf",          minOrder: 20, fee: 0 },
  { id: "06237-zoeschen",     plz: "06237", city: "Leuna", ortsteil: "Zöschen",                 ortsteilEn: "Zöschen",               minOrder: 25, fee: 0 },
  { id: "06237-horburg",      plz: "06237", city: "Leuna", ortsteil: "Horburg-Maßlau",          ortsteilEn: "Horburg-Maßlau",        minOrder: 15, fee: 0 },

  // 06258 Schkopau
  { id: "06258-ermlitz",      plz: "06258", city: "Schkopau", ortsteil: "Ermlitz",              ortsteilEn: "Ermlitz",               minOrder: 15, fee: 0 },
  { id: "06258-rassnitz",     plz: "06258", city: "Schkopau", ortsteil: "Raßnitz",              ortsteilEn: "Raßnitz",               minOrder: 25, fee: 0 },
  { id: "06258-roeglitz",     plz: "06258", city: "Schkopau", ortsteil: "Röglitz",              ortsteilEn: "Röglitz",               minOrder: 25, fee: 0 },
  { id: "06258-lochau",       plz: "06258", city: "Schkopau", ortsteil: "Lochau",               ortsteilEn: "Lochau",                minOrder: 25, fee: 0 },
];

/** Alle Zonen für eine PLZ */
export function getZonesForPlz(plz: string): DeliveryZone[] {
  return deliveryZones.filter((z) => z.plz === plz.trim());
}

/** Einzelne Zone per ID */
export function findZoneById(id: string): DeliveryZone | null {
  return deliveryZones.find((z) => z.id === id) ?? null;
}

/** Rückwärtskompatibel: erste Zone für PLZ (wenn nur eine vorhanden) */
export function findZone(plz: string): DeliveryZone | null {
  const zones = getZonesForPlz(plz);
  return zones.length === 1 ? zones[0] : null;
}

export function isValidPlz(plz: string): boolean {
  return /^\d{5}$/.test(plz.trim());
}

export function isValidStreet(street: string): boolean {
  return street.trim().length >= 2;
}

// Deutsche Telefonnummer – Festnetz und Mobil
// Akzeptiert: 0176 12345678, +49176 12345678, 034204 360529, (0176) 123 456 78
export function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-\(\)\/\.]/g, "");
  return /^(\+49|0049|0)[1-9]\d{7,13}$/.test(clean);
}

/** Alle PLZ-Nummern im Liefergebiet */
export const allDeliveryPlz = [...new Set(deliveryZones.map((z) => z.plz))];
