"use client";

import { useState, useEffect } from "react";
import type { Order } from "../api/orders/route";
import { formatEur } from "../lib/vatCalc";
import { menu } from "../data/menu";
import { getDailySpecials, saveDailySpecials } from "../data/dailySpecials";
import {
  getLunchConfig, saveLunchConfig, DEFAULT_LUNCH_CONFIG, LUNCH_ELIGIBLE_CAT_IDS,
  type LunchConfig,
} from "../data/lunchMenu";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function monthKey(iso: string) {
  return iso.slice(0, 7); // "2025-06"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface MonthStat {
  month: string;
  count: number;
  revenue: number;
  net7: number; vat7: number; gross7: number;
  net19: number; vat19: number; gross19: number;
}

function buildStats(orders: Order[]): MonthStat[] {
  const map = new Map<string, MonthStat>();
  for (const o of orders) {
    const key = monthKey(o.timestamp);
    const existing = map.get(key) ?? {
      month: key, count: 0, revenue: 0,
      net7: 0, vat7: 0, gross7: 0,
      net19: 0, vat19: 0, gross19: 0,
    };
    existing.count += 1;
    existing.revenue += o.total;
    existing.net7 += o.vat7.net;   existing.vat7 += o.vat7.vat;   existing.gross7 += o.vat7.gross;
    existing.net19 += o.vat19.net; existing.vat19 += o.vat19.vat; existing.gross19 += o.vat19.gross;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

// ─── Admin App ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"history" | "specials" | "lunch">("history");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [lunchConfig, setLunchConfig] = useState<LunchConfig>(DEFAULT_LUNCH_CONFIG);
  const [lunchSaved, setLunchSaved] = useState(false);
  const [specials, setSpecials] = useState(["", "", "", ""]);
  const [specialPrices, setSpecialPrices] = useState(["", "", "", ""]);
  const [specialsSaved, setSpecialsSaved] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loaded = getDailySpecials();
    setSpecials(loaded.map(s => s.itemId ?? ""));
    setSpecialPrices(loaded.map(s => s.customPrice != null ? String(s.customPrice) : ""));
    setLunchConfig(getLunchConfig());
  }, []);

  async function login() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?pin=${encodeURIComponent(pin)}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);
        setAuthed(true);
        setAuthError("");
      } else {
        setAuthError("Falscher PIN. Bitte nochmals versuchen.");
      }
    } catch {
      setAuthError("Verbindungsfehler. Server erreichbar?");
    }
    setLoading(false);
  }

  function saveSpecials() {
    if (specials.some(s => !s)) return;
    saveDailySpecials(specials.map((itemId, i) => {
      const p = parseFloat(specialPrices[i].replace(",", "."));
      return { itemId, ...(isNaN(p) ? {} : { customPrice: p }) };
    }));
    setSpecialsSaved(true);
    setTimeout(() => setSpecialsSaved(false), 2500);
  }

  // All menu items flat
  const allItems = menu.flatMap((cat) => cat.items.map((i) => ({ ...i, catName: cat.name })));

  const stats = buildStats(orders);
  const months = stats.map((s) => s.month);
  const currentStat = stats.find((s) => s.month === selectedMonth);

  const filteredOrders = selectedMonth
    ? orders.filter((o) => monthKey(o.timestamp) === selectedMonth)
    : orders;

  // ─── Login ──────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-amber-800 mb-2 text-center">🔐 Admin</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Rajmahal Schkeuditz</p>
          <input
            type="password"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="PIN / Passwort"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          {authError && <p className="text-red-500 text-xs mb-3">{authError}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60"
          >
            {loading ? "Prüfe…" : "Einloggen"}
          </button>
          <p className="text-xs text-gray-400 text-center mt-4">
            Standard-PIN: <code className="bg-gray-100 px-1 rounded">rajmahal2024</code><br />
            Ändern via Umgebungsvariable <code>ADMIN_PIN</code>
          </p>
        </div>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-amber-800">🍛 Rajmahal Admin</h1>
          <p className="text-xs text-gray-400">Bestellverwaltung · {orders.length} Bestellungen gesamt</p>
        </div>
        <a href="/" className="text-sm text-amber-700 hover:underline">← Zur App</a>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-6 pt-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {(["history", "specials", "lunch"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${tab === t ? "bg-amber-600 text-white" : "bg-white text-gray-600 border hover:bg-amber-50"}`}>
              {t === "history" ? "📊 Bestellhistorie" : t === "specials" ? "⭐ Tagesangebote" : "☀️ Mittagsangebot"}
            </button>
          ))}
        </div>

        {/* ── History Tab ── */}
        {tab === "history" && (
          <div className="space-y-6">
            {/* Monthly stats */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800">📅 Monatliche Auswertung</h2>
                <select
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">Alle Monate</option>
                  {months.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Stats table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Monat</th>
                      <th className="px-4 py-3 text-right">Bestellungen</th>
                      <th className="px-4 py-3 text-right">Umsatz (brutto)</th>
                      <th className="px-4 py-3 text-right">Netto 7%</th>
                      <th className="px-4 py-3 text-right">MwSt. 7%</th>
                      <th className="px-4 py-3 text-right">Netto 19%</th>
                      <th className="px-4 py-3 text-right">MwSt. 19%</th>
                      <th className="px-4 py-3 text-right">MwSt. Gesamt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedMonth && currentStat ? [currentStat] : stats).map((s) => (
                      <tr key={s.month} className="border-t hover:bg-amber-50 cursor-pointer" onClick={() => setSelectedMonth(selectedMonth === s.month ? "" : s.month)}>
                        <td className="px-4 py-3 font-bold text-gray-900">{s.month}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.count}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(s.revenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatEur(s.net7)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-800">{formatEur(s.vat7)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatEur(s.net19)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-800">{formatEur(s.vat19)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatEur(s.vat7 + s.vat19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order list */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="font-bold text-gray-800">
                  🧾 Bestellungen {selectedMonth ? `– ${selectedMonth}` : `(alle · ${orders.length})`}
                </h2>
              </div>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Keine Bestellungen</div>
              ) : (
                <div className="divide-y">
                  {[...filteredOrders].reverse().map((o) => (
                    <div key={o.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800">{o.customer.name}</span>
                            <span className="text-xs text-gray-600 font-medium">{o.customer.phone}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${o.orderType === "pickup" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                              {o.orderType === "pickup" ? "🏪 Abholung" : "🚴 Lieferung"}
                            </span>
                          </div>
                          {o.address && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {o.address.street} {o.address.houseNr}, {o.address.zip} {o.address.city}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {o.items.map((item) => (
                              <span key={item.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {item.qty}× {item.name}
                              </span>
                            ))}
                          </div>
                          {o.note && <p className="text-xs text-amber-700 mt-1">💬 {o.note}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-lg text-gray-900">{formatEur(o.total)}</div>
                          <div className="text-xs text-gray-700 font-medium">{formatDate(o.timestamp)}</div>
                          <div className="text-xs text-gray-600 font-mono">Nr. {o.id}</div>
                          <a
                            href={`/rechnung?id=${o.id}&data=${encodeURIComponent(JSON.stringify(o))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-amber-800 hover:text-amber-600 hover:underline"
                          >
                            🖨️ Rechnung
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Specials Tab ── */}
        {tab === "specials" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-xl">
            <h2 className="font-bold text-gray-800 mb-2">⭐ Tagesangebote festlegen</h2>
            <p className="text-sm text-gray-500 mb-5">
              Wählen Sie 4 Gerichte aus der Speisekarte als Tagesangebote aus.
            </p>

            {[1, 2, 3, 4].map((nr, idx) => {
              const value = specials[idx];
              const originalItem = allItems.find(i => i.id === value);
              return (
                <div key={nr} className="mb-5">
                  <label className="block text-sm font-bold text-amber-800 mb-1.5">Tagesangebot {nr}</label>
                  <select
                    className={`w-full border-2 rounded-xl px-3 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition appearance-none cursor-pointer
                      ${value ? "border-amber-500 bg-amber-50" : "border-gray-300 bg-white"}`}
                    value={value}
                    onChange={(e) => {
                      const updated = [...specials];
                      updated[idx] = e.target.value;
                      setSpecials(updated);
                      // Originalpreis vorausfüllen
                      const item = allItems.find(i => i.id === e.target.value);
                      const updatedPrices = [...specialPrices];
                      updatedPrices[idx] = item ? item.price.toFixed(2) : "";
                      setSpecialPrices(updatedPrices);
                    }}
                  >
                    <option value="">— Gericht wählen —</option>
                    {allItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.catName}] {item.name} – {item.price.toFixed(2).replace(".", ",")} €
                      </option>
                    ))}
                  </select>
                  {value && originalItem && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-gray-700">
                        <span className="font-semibold text-gray-900">{originalItem.name}</span>
                        <span className="text-gray-500 ml-1">(Kartenpreis: {originalItem.price.toFixed(2).replace(".", ",")} €)</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-xs font-semibold text-amber-800 whitespace-nowrap">Sonderpreis:</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.10"
                            className="w-24 border-2 border-amber-400 rounded-lg px-2 py-2 text-sm font-bold text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            value={specialPrices[idx]}
                            onChange={(e) => {
                              const updatedPrices = [...specialPrices];
                              updatedPrices[idx] = e.target.value;
                              setSpecialPrices(updatedPrices);
                            }}
                            placeholder={originalItem.price.toFixed(2)}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={saveSpecials}
              disabled={specials.some(s => !s) || new Set(specials).size < 4}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition disabled:opacity-50"
            >
              {specialsSaved ? "✅ Gespeichert!" : "Speichern"}
            </button>
            {new Set(specials.filter(Boolean)).size < specials.filter(Boolean).length && (
              <p className="text-red-500 text-xs mt-2">Bitte 4 verschiedene Gerichte wählen.</p>
            )}
          </div>
        )}
        {/* ── Mittagsangebot Tab ── */}
        {tab === "lunch" && (() => {
          const eligibleCats = menu.filter(c => LUNCH_ELIGIBLE_CAT_IDS.includes(c.id));

          // Anzeigename: erster Teil des Untertitels (vor "·"), sonst Kategoriename
          const catLabel = (cat: typeof eligibleCats[0]) => {
            if (cat.subtitle) {
              const first = cat.subtitle.split("·")[0].trim();
              if (!first.startsWith("Serviert")) return first;
            }
            return cat.name;
          };

          const slots: Array<{ key: "vegetarisch" | "vegan" | "haehnchen"; label: string; emoji: string; defaultPrice: number }> = [
            { key: "vegetarisch", label: "Vegetarisch", emoji: "🌿", defaultPrice: 9.50 },
            { key: "vegan",       label: "Vegan",       emoji: "🌱", defaultPrice: 8.50 },
            { key: "haehnchen",   label: "Hähnchen",    emoji: "🍗", defaultPrice: 9.50 },
          ];

          const weekdays = [
            { d: 1, label: "Mo" }, { d: 2, label: "Di" }, { d: 3, label: "Mi" },
            { d: 4, label: "Do" }, { d: 5, label: "Fr" }, { d: 6, label: "Sa" }, { d: 0, label: "So" },
          ];

          return (
            <div className="bg-white rounded-2xl shadow-sm p-6 max-w-xl">
              <h2 className="font-bold text-gray-800 mb-1">☀️ Mittagsangebot konfigurieren</h2>
              <p className="text-sm text-gray-500 mb-5">Gericht pro Kategorie auswählen, Preis und Angebotszeiten festlegen.</p>

              {/* Angebotszeiten */}
              <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-bold text-gray-800 mb-3">🕐 Angebotszeiten</p>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm text-gray-600 w-8">Von</label>
                  <input
                    type="time"
                    className="border-2 border-amber-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={lunchConfig.startTime}
                    onChange={(e) => setLunchConfig(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                  <label className="text-sm text-gray-600 w-6">Bis</label>
                  <input
                    type="time"
                    className="border-2 border-amber-400 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={lunchConfig.endTime}
                    onChange={(e) => setLunchConfig(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {weekdays.map(({ d, label }) => {
                    const active = lunchConfig.days.includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => setLunchConfig(prev => ({
                          ...prev,
                          days: active ? prev.days.filter(x => x !== d) : [...prev.days, d].sort(),
                        }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${active ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-300 text-gray-500"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3 Slots – Kategorie wählen */}
              {slots.map(({ key, label, emoji, defaultPrice }) => {
                const cfg = lunchConfig[key];
                const selectedCat = eligibleCats.find(c => c.id === cfg.categoryId);
                return (
                  <div key={key} className="mb-5">
                    <label className="block text-sm font-bold text-amber-800 mb-1.5">{emoji} {label}</label>
                    <select
                      className={`w-full border-2 rounded-xl px-3 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition appearance-none cursor-pointer
                        ${cfg.categoryId ? "border-amber-500 bg-amber-50" : "border-gray-300 bg-white"}`}
                      value={cfg.categoryId}
                      onChange={(e) => setLunchConfig(prev => ({ ...prev, [key]: { ...prev[key], categoryId: e.target.value } }))}
                    >
                      <option value="">— Gericht-Kategorie wählen —</option>
                      {eligibleCats.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {catLabel(cat)} ({cat.items.length} Gerichte)
                        </option>
                      ))}
                    </select>
                    {cfg.categoryId && selectedCat && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-gray-600 flex-1">
                          ✓ {selectedCat.emoji} {catLabel(selectedCat)} – {selectedCat.items.length} Gerichte zum Mittagspreis
                        </span>
                        <label className="text-xs font-semibold text-amber-800 whitespace-nowrap">Mittagspreis:</label>
                        <div className="relative">
                          <input
                            type="number" min="0" step="0.10"
                            className="w-24 border-2 border-amber-400 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-900 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                            value={cfg.price}
                            onChange={(e) => setLunchConfig(prev => ({
                              ...prev, [key]: { ...prev[key], price: parseFloat(e.target.value) || defaultPrice }
                            }))}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => { saveLunchConfig(lunchConfig); setLunchSaved(true); setTimeout(() => setLunchSaved(false), 2500); }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition"
              >
                {lunchSaved ? "✅ Gespeichert!" : "Speichern"}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
