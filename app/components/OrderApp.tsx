"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { menu, MenuItem, MenuCategory } from "../data/menu";
import { deliveryZones, getZonesForPlz, findZoneById, DeliveryZone, isValidPlz, isValidStreet, isValidPhone } from "../data/delivery";
import {
  isLunchTime, getLunchConfig, DEFAULT_LUNCH_CONFIG,
  type LunchConfig,
} from "../data/lunchMenu";
import { getDailySpecials, getItemById } from "../data/dailySpecials";
import { t, Lang } from "../data/i18n";
import { calcVat, formatEur } from "../lib/vatCalc";
import type { Order, OrderItem as ApiOrderItem } from "../api/orders/route";

// ─── Haversine-Distanz in km ──────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Carousel images ──────────────────────────────────────────────────────────
// Speichern Sie Ihre Fotos als /public/images/food1.jpg … food4.jpg
const HERO_IMAGES = [
  { src: "/images/food1.jpg", alt: "Samosas" },
  { src: "/images/food2.jpg", alt: "Biryani" },
  { src: "/images/food3.jpg", alt: "Curry" },
  { src: "/images/food4.jpg", alt: "Garnelen" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  cartId: string; itemId: string; name: string; nameEn: string;
  price: number; vatRate: 7 | 19; qty: number; nr?: string;
}
type OrderType = "pickup" | "delivery";
type Step = "menu" | "cart" | "checkout" | "confirm";
interface AddressForm { street: string; houseNr: string; zip: string; city: string; }
interface Errors { name?: string; phone?: string; email?: string; street?: string; houseNr?: string; zip?: string; city?: string; }

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── Small UI helpers ─────────────────────────────────────────────────────────
const D = {
  bg:      "bg-[#2a1505]",   // aufgehellt von #0c0703
  surface: "bg-[#3d1f08]",   // aufgehellt von #1a0e06
  surface2:"bg-[#4e2a0d]",   // aufgehellt von #251508
  border:  "border-[#6b3a12]",
  text:    "text-[#fdf0d8]",
  muted:   "text-[#c09060]",
  gold:    "text-[#e8c46a]",
  goldBg:  "bg-[#c9a23a]",
  input:   "bg-[#4e2a0d] border-[#6b3a12] text-[#fdf0d8] placeholder-[#9a6a3a] focus:ring-[#c9a23a] focus:border-[#c9a23a]",
  btn:     "bg-[#c9a23a] hover:bg-[#b8922e] text-[#1a0800] font-bold",
  btnSm:   "bg-[#4e2a0d] hover:bg-[#6b3a12] text-[#e8c46a] border border-[#6b3a12]",
};

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>;
}
function Spicy({ n }: { n: number }) {
  return <span className="text-xs" title={`Schärfe ${n}/3`}>{"🌶️".repeat(n)}</span>;
}
function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div>
      <input {...props} className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${D.input} ${error ? "border-red-500" : ""} ${props.className ?? ""}`} />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrderApp() {
  const [lang, setLang] = useState<Lang>("de");
  const tr = t[lang];
  const iDe = lang === "de";

  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("menu");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [orderType, setOrderType] = useState<OrderType>("pickup");
  const [address, setAddress] = useState<AddressForm>({ street: "", houseNr: "", zip: "", city: "" });
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneSearch, setZoneSearch] = useState("");
  const [showZoneList, setShowZoneList] = useState(false);
  const [zoneLoc, setZoneLoc] = useState<{ lat: number; lon: number } | null>(null);
  const zoneSearchRef = useRef<HTMLDivElement>(null);
  const [streetQuery, setStreetQuery] = useState("");
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [showStreetDrop, setShowStreetDrop] = useState(false);
  const streetRef = useRef<HTMLDivElement>(null);
  const [lunchOpen, setLunchOpen] = useState(false);
  const [lunchConfig, setLunchConfig] = useState<LunchConfig>(DEFAULT_LUNCH_CONFIG);
  const [dailySpecials, setDailySpecials] = useState<import("../data/dailySpecials").DailySpecial[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "cash">("paypal");
  const [cashSubmitting, setCashSubmitting] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const PAYPAL_CLIENT_ID = "sb";

  useEffect(() => {
    const cfg = getLunchConfig();
    setLunchConfig(cfg);
    setLunchOpen(isLunchTime(cfg));
    setDailySpecials(getDailySpecials());
  }, []);

  // Hero carousel
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Delivery – Zone ist jetzt die primäre Eingabe
  const zone: DeliveryZone | null = selectedZoneId ? (findZoneById(selectedZoneId) ?? null) : null;
  const deliveryFee = zone?.fee ?? 0;
  const minOrder = zone?.minOrder ?? 0;
  const subtotal = cart.reduce((s, ci) => s + ci.price * ci.qty, 0);
  const total = subtotal + deliveryFee;
  const cartCount = cart.reduce((s, ci) => s + ci.qty, 0);
  const { vat7, vat19 } = calcVat(cart, deliveryFee);
  const belowMinOrder = orderType === "delivery" && !!zone && subtotal < minOrder;
  const missing = belowMinOrder ? minOrder - subtotal : 0;

  // Zone gewählt → PLZ + Stadt auto-fill + Koordinaten für Straßensuche holen
  useEffect(() => {
    if (!zone) return;
    setAddress((a) => ({ ...a, zip: zone.plz, city: zone.city }));
    setStreetQuery("");
    setStreetSuggestions([]);
    setZoneLoc(null);
    // Koordinaten des Ortsteils einmalig abrufen
    (async () => {
      try {
        const q = encodeURIComponent(`${zone.ortsteil} ${zone.plz} ${zone.city} Deutschland`);
        const res = await fetch(`https://photon.komoot.io/api/?q=${q}&limit=1&lang=de`);
        const data: { features: { geometry: { coordinates: [number, number] } }[] } = await res.json();
        if (data.features?.[0]) {
          const [lon, lat] = data.features[0].geometry.coordinates;
          setZoneLoc({ lat, lon });
        }
      } catch { /* ignorieren */ }
    })();
  }, [zone?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Straßen-Autocomplete via Photon mit Koordinaten-Kontext
  useEffect(() => {
    if (!streetQuery || streetQuery.length < 2 || !zone) {
      setStreetSuggestions([]);
      setShowStreetDrop(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // Mit Koordinaten: präzise Ortssuche; ohne: Ortsname im Query
        const locPart = zoneLoc
          ? `&lat=${zoneLoc.lat}&lon=${zoneLoc.lon}`
          : `&q=${encodeURIComponent(streetQuery + " " + zone.ortsteil + " " + zone.plz)}`;
        const qPart = zoneLoc ? `q=${encodeURIComponent(streetQuery)}` : "";
        const url = zoneLoc
          ? `https://photon.komoot.io/api/?${qPart}${locPart}&limit=15&lang=de&osm_tag=highway`
          : `https://photon.komoot.io/api/?${locPart.slice(1)}&limit=15&lang=de&osm_tag=highway`;

        const res = await fetch(url);
        const data: {
          features: {
            geometry: { coordinates: [number, number] };
            properties: {
              osm_key?: string; osm_value?: string;
              name?: string; city?: string; locality?: string;
              district?: string; postcode?: string; type?: string;
            };
          }[]
        } = await res.json();

        // Radius: 8 km wenn Koordinaten bekannt, sonst nur PLZ-Match als Fallback
        const MAX_KM = 8;

        const streets = [...new Set(
          (data.features || [])
            .filter((f) => {
              const p = f.properties;
              if (p.osm_key !== "highway") return false;
              const skip = ["city", "locality", "village", "town", "suburb", "borough", "quarter"];
              if (p.type && skip.includes(p.type)) return false;
              // Distanzfilter: nur Straßen innerhalb MAX_KM vom Ortsteil
              if (zoneLoc) {
                const [fLon, fLat] = f.geometry.coordinates;
                if (haversineKm(zoneLoc.lat, zoneLoc.lon, fLat, fLon) > MAX_KM) return false;
              }
              return true;
            })
            .map((f) => f.properties.name)
            .filter((n): n is string => !!n && n.trim().length > 0)
        )].sort();

        setStreetSuggestions(streets);
        setShowStreetDrop(streets.length > 0);
      } catch { /* offline */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [streetQuery, zone?.id, zoneLoc]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dropdowns schließen bei Klick außerhalb
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (streetRef.current && !streetRef.current.contains(e.target as Node)) setShowStreetDrop(false);
      if (zoneSearchRef.current && !zoneSearchRef.current.contains(e.target as Node)) setShowZoneList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cart helpers
  const addFromMenu = (item: MenuItem) =>
    setCart((c) => {
      const ex = c.find((ci) => ci.cartId === item.id);
      if (ex) return c.map((ci) => ci.cartId === item.id ? { ...ci, qty: ci.qty + 1 } : ci);
      return [...c, { cartId: item.id, itemId: item.id, name: item.name, nameEn: item.nameEn, nr: item.nr, price: item.price, vatRate: item.vatRate, qty: 1 }];
    });

  const addLunch = (item: MenuItem, lunchPrice: number) => {
    const cid = `lunch-${item.id}`;
    setCart((c) => {
      const ex = c.find((ci) => ci.cartId === cid);
      if (ex) return c.map((ci) => ci.cartId === cid ? { ...ci, qty: ci.qty + 1 } : ci);
      return [...c, { cartId: cid, itemId: cid, name: `☀️ ${item.name}`, nameEn: `☀️ ${item.nameEn}`, nr: item.nr, price: lunchPrice, vatRate: 7 as const, qty: 1 }];
    });
  };

  const updateQty = (cartId: string, delta: number) =>
    setCart((c) => c.map((ci) => ci.cartId === cartId ? { ...ci, qty: ci.qty + delta } : ci).filter((ci) => ci.qty > 0));
  const removeItem = (cartId: string) => setCart((c) => c.filter((ci) => ci.cartId !== cartId));
  const clearCart = () => setCart([]);
  const getQty = (id: string) => cart.find((ci) => ci.cartId === id)?.qty ?? 0;

  const canCheckout = cart.length > 0 && !belowMinOrder &&
    (orderType === "pickup" || (!!zone && !!address.street && !!address.houseNr));

  // Scroll spy
  useEffect(() => {
    if (step !== "menu") return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveCategory(e.target.id); }),
      { rootMargin: "-110px 0px -60% 0px" }
    );
    ["lunch-section", "specials-section", ...menu.map((c) => c.id)]
      .forEach((id) => { const el = categoryRefs.current[id]; if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [step, lunchOpen]);

  // PayPal loader
  useEffect(() => {
    if (step !== "checkout" || paypalLoaded) return;
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=EUR&locale=${iDe ? "de_DE" : "en_GB"}`;
    s.onload = () => setPaypalLoaded(true);
    document.body.appendChild(s);
    return () => { try { document.body.removeChild(s); } catch { /**/ } };
  }, [step, paypalLoaded, iDe]);

  useEffect(() => {
    if (!paypalLoaded || !paypalRef.current) return;
    const w = window as unknown as { paypal?: { Buttons: (o: unknown) => { render: (el: HTMLElement) => void } } };
    if (!w.paypal) return;
    paypalRef.current.innerHTML = "";
    w.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },
      createOrder: (_: unknown, a: { order: { create: (o: unknown) => Promise<string> } }) =>
        a.order.create({ purchase_units: [{ amount: { value: total.toFixed(2), currency_code: "EUR" }, description: `Rajmahal ${orderType}` }] }),
      onApprove: async (_: unknown, a: { order: { capture: () => Promise<{ id: string }> } }) => {
        const cap = await a.order.capture();
        const order = buildOrder(cap.id);
        const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
        const json = await res.json().catch(() => ({}));
        if (json.id) order.id = json.id;
        setConfirmedOrder(order);
        setCart([]);
        setStep("confirm");
      },
    }).render(paypalRef.current);
  }, [paypalLoaded, total, orderType]);

  const validate = useCallback((): boolean => {
    const e: Errors = {};
    if (!name.trim()) e.name = iDe ? "Name fehlt" : "Name required";
    if (!isValidPhone(phone)) e.phone = tr.invalidPhone;
    if (orderType === "delivery") {
      if (!selectedZoneId) e.zip = iDe ? "Bitte Liefergebiet wählen" : "Please select delivery area";
      if (!address.street.trim()) e.street = tr.invalidStreet;
      if (!address.houseNr.trim()) e.houseNr = tr.invalidStreet;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [name, phone, address, orderType, tr, iDe]);

  function buildOrder(paypalOrderId: string): Order {
    const items: ApiOrderItem[] = cart.map((ci) => ({ id: ci.cartId, name: ci.name, price: ci.price, qty: ci.qty, vatRate: ci.vatRate }));
    return { id: uid(), timestamp: new Date().toISOString(), orderType, customer: { name, phone, email: email || undefined },
      address: orderType === "delivery" ? { ...address } : undefined,
      items, note: note || undefined, subtotal, deliveryFee, total, vat7, vat19, paypalOrderId, lang };
  }

  const scrollTo = (id: string) => {
    const el = categoryRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 115, behavior: "smooth" });
    setActiveCategory(id);
  };

  // ── Shared header component ───────────────────────────────────────────────
  const AppHeader = ({ back, backLabel, title }: { back: Step; backLabel: string; title: string }) => (
    <header className={`sticky top-0 z-30 ${D.surface} border-b ${D.border} shadow-lg`}>
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => setStep(back)} className={`${D.gold} font-medium text-sm`}>← {backLabel}</button>
        <h1 className={`font-bold ${D.text}`}>{title}</h1>
        <button onClick={() => setLang(iDe ? "en" : "de")}
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${D.surface2} ${D.gold} border ${D.border}`}>
          {tr.language}
        </button>
      </div>
    </header>
  );

  // ─── CONFIRM ──────────────────────────────────────────────────────────────
  if (step === "confirm" && confirmedOrder) {
    const o = confirmedOrder;
    return (
      <div className={`min-h-screen ${D.bg} flex flex-col items-center justify-center p-6`}>
        <div className={`${D.surface} rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-t-4 border-[#c9a23a]`}>
          <div className="text-6xl mb-4">🎉</div>
          <h2 className={`text-2xl font-bold ${D.gold} mb-2`}>{tr.thankYou}</h2>
          <p className={`${D.text} mb-1`}>{tr.orderReceived}</p>
          {o.orderType === "pickup"
            ? <p className={`text-sm ${D.muted} mt-1`}>{tr.pickupAt}</p>
            : <p className={`text-sm ${D.muted} mt-1`}>{tr.deliverTo} {o.address?.street} {o.address?.houseNr}, {o.address?.zip} {o.address?.city}</p>}
          <p className={`text-sm mt-2 font-semibold ${o.paypalOrderId === "CASH" ? "text-amber-400" : "text-blue-400"}`}>
            {o.paypalOrderId === "CASH"
              ? (o.orderType === "delivery"
                  ? (iDe ? "💵 Barzahlung bei Lieferung" : "💵 Cash on delivery")
                  : (iDe ? "💵 Barzahlung bei Abholung" : "💵 Cash on pickup"))
              : "💳 PayPal"}
          </p>
          <p className={`${D.muted} text-xs mt-3`}>{tr.questions}</p>
          <p className={`${D.muted} text-xs`}>Nr.: {o.id}</p>
          <div className="flex gap-3 mt-6 flex-col sm:flex-row">
            <button
              onClick={() => window.open(`/rechnung?data=${encodeURIComponent(JSON.stringify(o))}`, "_blank")}
              className={`flex-1 border-2 border-[#c9a23a] ${D.gold} font-semibold py-3 rounded-2xl hover:bg-[#251508] transition text-sm`}>
              🖨️ {tr.printInvoice}
            </button>
            <button onClick={() => { setStep("menu"); setConfirmedOrder(null); }}
              className={`flex-1 ${D.btn} py-3 rounded-2xl transition`}>
              {tr.newOrder}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── CHECKOUT ────────────────────────────────────────────────────────────
  if (step === "checkout") {
    return (
      <div className={`min-h-screen ${D.bg} pb-10`}>
        <AppHeader back="cart" backLabel={tr.cart} title={iDe ? "Kasse" : "Checkout"} />
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* Order type */}
          <section className={`${D.surface} rounded-2xl p-4 border ${D.border}`}>
            <h3 className={`font-semibold ${D.text} mb-3`}>{tr.orderType}</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["pickup", "delivery"] as OrderType[]).map((ot) => (
                <button key={ot} onClick={() => { setOrderType(ot); setErrors({}); setSelectedZoneId(null); }}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                    orderType === ot
                      ? "border-[#c9a23a] bg-[#251508] text-[#c9a23a]"
                      : `${D.border} ${D.muted} hover:border-[#c9a23a]`
                  }`}>
                  {ot === "pickup" ? tr.pickupLabel : tr.deliveryLabel}
                </button>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className={`${D.surface} rounded-2xl p-4 border ${D.border} space-y-3`}>
            <h3 className={`font-semibold ${D.text}`}>{tr.contact}</h3>
            <Input placeholder={tr.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <Input placeholder={tr.phonePlaceholder} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
            <Input
              placeholder={iDe ? "E-Mail (für Bestellbestätigung, optional)" : "Email (for order confirmation, optional)"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </section>

          {/* Delivery address – Zone zuerst, dann Straße mit Autocomplete */}
          {orderType === "delivery" && (
            <section className={`${D.surface} rounded-2xl p-4 border ${D.border} space-y-4`}>
              <h3 className={`font-semibold ${D.text}`}>{iDe ? "Lieferadresse" : "Delivery address"}</h3>

              {/* SCHRITT 1 – Liefergebiet suchen & wählen */}
              <div>
                <label className={`text-xs font-semibold ${D.gold} mb-1 block`}>
                  ① {iDe ? "Liefergebiet wählen *" : "Select delivery area *"}
                </label>

                {/* Suchfeld + Dropdown-Container */}
                <div ref={zoneSearchRef} className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder={iDe ? "Klicken oder PLZ / Ort eingeben…" : "Click or enter ZIP / city…"}
                    value={zoneSearch}
                    onFocus={() => setShowZoneList(true)}
                    onChange={(e) => {
                      setZoneSearch(e.target.value);
                      setSelectedZoneId(null);
                      setStreetQuery("");
                      setAddress((a) => ({ ...a, street: "", houseNr: "", zip: "", city: "" }));
                      setShowZoneList(true);
                    }}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a23a] ${D.surface2} ${D.text} placeholder-[#9a6a3a]
                      ${errors.zip ? "border-red-500" : zone ? "border-green-600" : `border-[#6b3a12]`}`}
                  />

                  {/* Dropdown – öffnet bei Fokus, filtert bei Eingabe */}
                  {showZoneList && !selectedZoneId && (() => {
                    const q = zoneSearch.trim().toLowerCase();
                    const filtered = q.length === 0
                      ? deliveryZones               // leer → alle zeigen
                      : deliveryZones.filter((z) =>
                          z.plz.startsWith(q) ||
                          z.city.toLowerCase().includes(q) ||
                          z.ortsteil.toLowerCase().includes(q)
                        );

                    if (q.length > 0 && filtered.length === 0) {
                      return (
                        <div className={`absolute z-50 left-0 right-0 mt-1 ${D.surface} border ${D.border} rounded-xl shadow-2xl p-3`}>
                          <p className="text-red-400 text-xs">
                            ❌ {iDe
                              ? "Kein Liefergebiet gefunden. Bitte Abholung wählen oder anrufen: 0176 64 91 88 23"
                              : "No delivery area found. Please choose pickup or call us."}
                          </p>
                        </div>
                      );
                    }

                    const cities = Array.from(new Set(filtered.map((z) => z.city)));
                    return (
                      <div className={`absolute z-50 left-0 right-0 mt-1 ${D.surface} border ${D.border} rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto`}>
                        {cities.map((city, ci) => (
                          <div key={city}>
                            <div className={`px-3 py-1.5 text-xs font-bold ${D.gold} ${D.surface2} uppercase tracking-wide sticky top-0`}>
                              {city}
                            </div>
                            {filtered.filter((z) => z.city === city).map((z, zi, arr) => (
                              <button
                                key={z.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()} // Focus nicht verlieren
                                onClick={() => {
                                  setSelectedZoneId(z.id);
                                  setZoneSearch(`${z.ortsteil} (${z.plz})`);
                                  setShowZoneList(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition flex justify-between items-center
                                  ${D.text} hover:bg-[#6b3a12]
                                  ${zi < arr.length - 1 || ci < cities.length - 1 ? `border-b ${D.border}` : ""}`}
                              >
                                <span>{z.ortsteil} <span className={`text-xs ${D.muted}`}>({z.plz})</span></span>
                                <span className={`text-xs font-semibold ml-3 whitespace-nowrap ${D.gold}`}>
                                  {iDe ? "K.L. ab" : "free from"} {formatEur(z.minOrder)}
                                </span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {errors.zip && <p className="text-red-400 text-xs mt-1">{errors.zip}</p>}
              </div>

              {/* Zonen-Bestätigung + auto-ausgefüllte PLZ/Stadt */}
              {zone && (
                <>
                  {/* Info-Box */}
                  <div className={`rounded-xl p-3 text-sm border ${
                    belowMinOrder ? "bg-amber-950 border-amber-700 text-amber-200" : "bg-green-950 border-green-700 text-green-300"
                  }`}>
                    {belowMinOrder ? (
                      <>
                        <p className="font-bold">⚠️ {iDe ? "Mindestbestellwert nicht erreicht" : "Minimum order not reached"}</p>
                        <p className="mt-0.5">{zone.city} – {zone.ortsteil}: {iDe ? "mind." : "min."} {formatEur(minOrder)}</p>
                        <p className="font-extrabold mt-1 text-amber-300">
                          {iDe ? `Bitte noch ${formatEur(missing)} zur Bestellung hinzufügen.` : `Please add ${formatEur(missing)} more.`}
                        </p>
                      </>
                    ) : (
                      <p>✅ <strong>{zone.city} – {zone.ortsteil}</strong> · PLZ {zone.plz} · {iDe ? "Kostenlose Lieferung ab" : "Free from"} {formatEur(zone.minOrder)}</p>
                    )}
                  </div>

                  {/* Auto-ausgefüllte PLZ + Stadt (read-only zur Bestätigung) */}
                  <div className="flex gap-2">
                    <div className="w-28">
                      <label className={`text-xs ${D.muted} mb-0.5 block`}>{iDe ? "PLZ (auto)" : "ZIP (auto)"}</label>
                      <div className={`border ${D.border} rounded-xl px-3 py-2 text-sm font-mono ${D.muted} ${D.surface2} opacity-70`}>
                        {zone.plz}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className={`text-xs ${D.muted} mb-0.5 block`}>{iDe ? "Stadt (auto)" : "City (auto)"}</label>
                      <div className={`border ${D.border} rounded-xl px-3 py-2 text-sm ${D.muted} ${D.surface2} opacity-70`}>
                        {zone.city}
                      </div>
                    </div>
                  </div>

                  {/* SCHRITT 2 – Straße mit Autocomplete */}
                  <div ref={streetRef} className="relative">
                    <label className={`text-xs font-semibold ${D.gold} mb-1 block`}>
                      ② {iDe ? "Straße *" : "Street *"}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder={iDe ? `Straße in ${zone.ortsteil} eingeben…` : `Enter street in ${zone.ortsteil}…`}
                      value={streetQuery}
                      onFocus={() => streetSuggestions.length > 0 && setShowStreetDrop(true)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStreetQuery(v);
                        setAddress((a) => ({ ...a, street: v }));
                        setShowStreetDrop(true);
                      }}
                      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a23a] transition ${D.surface2} ${D.text} placeholder-[#9a6a3a]
                        ${errors.street ? "border-red-500" : address.street ? "border-green-700" : `border-[#6b3a12]`}`}
                    />
                    {errors.street && <p className="text-red-400 text-xs mt-1">{errors.street}</p>}

                    {/* Straßen-Dropdown */}
                    {showStreetDrop && streetSuggestions.length > 0 && (
                      <ul className={`absolute z-50 left-0 right-0 mt-1 ${D.surface} border ${D.border} rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto`}>
                        {streetSuggestions.map((s) => (
                          <li key={s}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setStreetQuery(s);
                                setAddress((a) => ({ ...a, street: s }));
                                setShowStreetDrop(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm ${D.text} hover:bg-[#6b3a12] transition border-b ${D.border} last:border-0`}
                            >
                              📍 {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {streetQuery.length >= 4 && streetSuggestions.length === 0 && (
                      <p className={`text-xs ${D.muted} mt-1`}>
                        {iDe ? "Keine Vorschläge – bitte manuell eingeben." : "No suggestions – please type manually."}
                      </p>
                    )}
                  </div>

                  {/* SCHRITT 3 – Hausnummer */}
                  <div className="w-36">
                    <label className={`text-xs font-semibold ${D.gold} mb-1 block`}>
                      ③ {iDe ? "Hausnummer *" : "House no. *"}
                    </label>
                    <Input
                      placeholder="z.B. 12a"
                      value={address.houseNr}
                      onChange={(e) => setAddress((a) => ({ ...a, houseNr: e.target.value }))}
                      error={errors.houseNr}
                    />
                  </div>
                </>
              )}
            </section>
          )}

          {/* Note */}
          <section className={`${D.surface} rounded-2xl p-4 border ${D.border}`}>
            <textarea rows={2} placeholder={tr.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a23a] resize-none ${D.surface2} ${D.text} ${D.border} placeholder-[#705040]`} />
          </section>

          {/* Summary */}
          <section className={`${D.surface} rounded-2xl p-4 border ${D.border}`}>
            <h3 className={`font-semibold ${D.text} mb-3`}>{tr.summary}</h3>
            {cart.map((ci) => (
              <div key={ci.cartId} className={`flex justify-between text-sm ${D.text} py-0.5`}>
                <span>{ci.qty}× {iDe ? ci.name : ci.nameEn}</span>
                <span>{formatEur(ci.price * ci.qty)}</span>
              </div>
            ))}
            {zone && (
              <div className={`flex justify-between text-sm ${D.muted} border-t ${D.border} mt-2 pt-2`}>
                <span>{tr.deliveryFee}</span>
                <span>{zone.fee === 0 ? tr.freeDelivery : formatEur(zone.fee)}</span>
              </div>
            )}
            <div className={`flex justify-between font-bold ${D.text} border-t ${D.border} mt-1 pt-2`}>
              <span>{tr.total}</span><span className={D.gold}>{formatEur(total)}</span>
            </div>
            <div className={`mt-2 pt-2 border-t ${D.border} text-xs ${D.muted} space-y-0.5`}>
              {vat7.gross > 0 && <div className="flex justify-between"><span>{tr.vat7}</span><span>{formatEur(vat7.vat)}</span></div>}
              {vat19.gross > 0 && <div className="flex justify-between"><span>{tr.vat19}</span><span>{formatEur(vat19.vat)}</span></div>}
            </div>
          </section>

          {/* Zahlungsmethode + Absenden */}
          {canCheckout ? (
            <>
              {/* Zahlungsart wählen */}
              <section className={`${D.surface} rounded-2xl p-4 border ${D.border}`}>
                <h3 className={`font-semibold ${D.text} mb-3`}>
                  {iDe ? "Zahlungsart" : "Payment method"}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(["paypal", "cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition flex flex-col items-center gap-1 ${
                        paymentMethod === m
                          ? "border-[#c9a23a] bg-[#4e2a0d] text-[#e8c46a]"
                          : `border-[#6b3a12] ${D.muted} hover:border-[#c9a23a]`
                      }`}
                    >
                      <span className="text-xl">{m === "paypal" ? "💳" : "💵"}</span>
                      <span>
                        {m === "paypal"
                          ? "PayPal"
                          : orderType === "delivery"
                            ? (iDe ? "Bar bei Lieferung" : "Cash on delivery")
                            : (iDe ? "Bar bei Abholung" : "Cash on pickup")}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* PayPal Button */}
              {paymentMethod === "paypal" && (
                <section className={`${D.surface} rounded-2xl p-4 border ${D.border}`}>
                  <h3 className={`font-semibold ${D.text} mb-3`}>{tr.payWithPaypal}</h3>
                  {!paypalLoaded && (
                    <p className={`text-sm ${D.muted} text-center py-3 animate-pulse`}>{tr.paypalLoading}</p>
                  )}
                  <div ref={paypalRef} />
                </section>
              )}

              {/* Bargeld-Button */}
              {paymentMethod === "cash" && (
                <button
                  type="button"
                  disabled={cashSubmitting}
                  onClick={async () => {
                    if (!validate()) return;
                    setCashSubmitting(true);
                    const order = buildOrder("CASH");
                    try {
                      const res = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(order),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (json.id) order.id = json.id;
                    } catch { /* offline */ }
                    setConfirmedOrder(order);
                    setCart([]);
                    setStep("confirm");
                    setCashSubmitting(false);
                  }}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition shadow-lg
                    ${cashSubmitting
                      ? "bg-[#6b3a12] text-[#9a6a3a] cursor-wait"
                      : `${D.goldBg} hover:bg-[#b8922e] text-[#1a0800]`}`}
                >
                  {cashSubmitting
                    ? (iDe ? "Wird gesendet…" : "Sending…")
                    : orderType === "delivery"
                      ? (iDe ? "✅ Jetzt bestellen – Barzahlung bei Lieferung" : "✅ Order now – Pay cash on delivery")
                      : (iDe ? "✅ Jetzt bestellen – Barzahlung bei Abholung" : "✅ Order now – Pay cash on pickup")}
                </button>
              )}
            </>
          ) : (
            <div className="bg-amber-950 border border-amber-700 rounded-xl p-3 text-sm text-amber-200 text-center">
              {cart.length === 0 ? tr.minOneItem : belowMinOrder
                ? `${tr.belowMin} ${formatEur(minOrder)} – ${iDe ? "noch" : "add"} ${formatEur(missing)}`
                : tr.fillRequired}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CART ────────────────────────────────────────────────────────────────
  if (step === "cart") {
    return (
      <div className={`min-h-screen ${D.bg} pb-28`}>
        <AppHeader back="menu" backLabel={iDe ? "Speisekarte" : "Menu"} title={tr.cart} />
        <div className="max-w-lg mx-auto px-4 py-5">
          {cart.length === 0 ? (
            <div className={`text-center py-16 ${D.muted}`}>
              <div className="text-5xl mb-3">🛒</div>
              <p>{tr.emptyCart}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((ci) => (
                <div key={ci.cartId} className={`${D.surface} rounded-2xl p-4 border ${D.border} flex items-center gap-3`}>
                  <div className="flex-1 min-w-0">
                    {ci.nr && <span className={`text-[10px] ${D.muted} font-mono`}>{ci.nr}</span>}
                    <div className={`font-medium ${D.text} text-sm leading-snug`}>{iDe ? ci.name : ci.nameEn}</div>
                    <div className={`${D.gold} font-semibold text-sm`}>{formatEur(ci.price)}</div>
                    <div className={`${D.muted} text-[10px]`}>MwSt. {ci.vatRate}%</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(ci.cartId, -1)}
                      className={`w-8 h-8 rounded-full ${D.surface2} ${D.text} font-bold hover:bg-[#3d2008] transition`}>−</button>
                    <span className={`w-5 text-center font-semibold text-sm ${D.text}`}>{ci.qty}</span>
                    <button onClick={() => updateQty(ci.cartId, +1)}
                      className={`w-8 h-8 rounded-full ${D.goldBg} text-[#0c0703] font-bold hover:bg-[#b8922e] transition`}>+</button>
                  </div>
                  <div className={`w-16 text-right font-semibold text-sm ${D.gold}`}>{formatEur(ci.price * ci.qty)}</div>
                </div>
              ))}
              <div className={`${D.surface} rounded-2xl p-4 border ${D.border} text-sm`}>
                <div className={`flex justify-between font-bold ${D.text}`}>
                  <span>{tr.subtotal}</span><span className={D.gold}>{formatEur(subtotal)}</span>
                </div>
                {vat7.gross > 0 && <div className={`flex justify-between text-xs ${D.muted} mt-1`}><span>{tr.vat7}</span><span>{formatEur(vat7.vat)}</span></div>}
                {vat19.gross > 0 && <div className={`flex justify-between text-xs ${D.muted}`}><span>{tr.vat19}</span><span>{formatEur(vat19.vat)}</span></div>}
              </div>
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className={`fixed bottom-0 left-0 right-0 ${D.surface} border-t ${D.border} px-4 py-4`}>
            <button onClick={() => setStep("checkout")}
              className={`w-full max-w-lg mx-auto block ${D.btn} py-4 rounded-2xl shadow-lg text-base`}>
              {tr.toCheckout} · {formatEur(subtotal)}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── MENU ────────────────────────────────────────────────────────────────
  const dailySpecialItems = dailySpecials
    .map(s => {
      const item = getItemById(s.itemId);
      if (!item) return null;
      return s.customPrice != null ? { ...item, price: s.customPrice } : item;
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof getItemById>>[];

  return (
    <div className={`min-h-screen ${D.bg} pb-28`}>

      {/* ── Sticky header ── */}
      <header className={`sticky top-0 z-30 ${D.surface} border-b ${D.border} shadow-xl`}>
        <div className="max-w-3xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="Rajmahal"
              className="h-14 w-auto"
              style={{ maxWidth: "180px", objectFit: "contain" }}
            />
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin"
              className={`text-xs px-2.5 py-1.5 rounded-full font-bold border ${D.border} ${D.surface2} ${D.muted} hover:text-[#c9a23a] transition-colors hidden sm:block`}
              title="Admin-Bereich">
              ⚙️
            </a>
            <button onClick={() => setLang(iDe ? "en" : "de")}
              className={`text-xs px-2.5 py-1.5 rounded-full font-bold border ${D.border} ${D.surface2} ${D.gold}`}>
              {tr.language}
            </button>
            <button onClick={() => setStep("cart")}
              className={`relative ${D.goldBg} hover:bg-[#b8922e] text-[#0c0703] px-3 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 transition shadow-lg`}>
              🛒 {formatEur(subtotal)}
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Category nav – 2-zeilig */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2">
          {lunchOpen && (
            <button onClick={() => scrollTo("lunch-section")}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition ${
                activeCategory === "lunch-section" ? `${D.goldBg} text-[#1a0800]` : "bg-yellow-900/40 text-yellow-300 hover:bg-yellow-900/60"
              }`}>
              ☀️ {iDe ? "Mittagsangebot" : "Lunch"}
            </button>
          )}
          {dailySpecialItems.length > 0 && (
            <button onClick={() => scrollTo("specials-section")}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition ${
                activeCategory === "specials-section" ? `${D.goldBg} text-[#1a0800]` : "bg-[#3d2008] text-[#c9a23a] hover:bg-[#4a2810]"
              }`}>
              ⭐ {iDe ? "Tagesangebote" : "Specials"}
            </button>
          )}
          {menu.map((cat) => (
            <button key={cat.id} onClick={() => scrollTo(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                activeCategory === cat.id ? `${D.goldBg} text-[#1a0800]` : `${D.surface2} ${D.muted} hover:text-[#c9a23a]`
              }`}>
              {cat.emoji} {iDe ? cat.name : cat.nameEn}
            </button>
          ))}
        </div>
      </header>

      {/* ── Hero – Bildkarussell ── */}
      {/* Karussell – CSS background-image, kein 404-Fehler bei fehlenden Bildern */}
      <div className="relative overflow-hidden" style={{ height: "280px" }}>
        {/* Fallback-Gradient (immer im Hintergrund sichtbar) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4e2a0d] via-[#2a1505] to-[#1a0e06]" />
        {HERO_IMAGES.map((img, i) => (
          <div
            key={i}
            aria-label={img.alt}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
            style={{ backgroundImage: `url('${img.src}')` }}
          />
        ))}
        {/* Dunkler Gradient-Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
        {/* Hero-Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <img
            src="/images/logo.png"
            alt="Rajmahal"
            className="mb-3 drop-shadow-2xl"
            style={{ height: "140px", width: "auto", maxWidth: "360px", objectFit: "contain" }}
          />
          <div className="flex gap-3 text-sm text-white/90 flex-wrap justify-center font-medium">
            <span>🏪 {iDe ? "Abholung" : "Pickup"}</span>
            <span className="text-[#c9a23a]">·</span>
            <span>🚴 {iDe ? "Lieferung" : "Delivery"}</span>
            <span className="text-[#c9a23a]">·</span>
            <span>💳 PayPal</span>
          </div>
          <div className="mt-3 text-xs text-white/60 space-y-0.5">
            <p>📍 Friedrich-Ebert-Str. 16 · 04435 Schkeuditz</p>
            <p>🕐 Mo–Fr & So: 10:30–14:30 & 16:30–22:30 · Sa: 16:00–23:00</p>
            <p>📞 034204–360529 · 📱 0176–64 91 88 23</p>
          </div>
        </div>
        {/* Karussel-Dots */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {HERO_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setHeroIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === heroIdx ? "bg-[#c9a23a] w-5" : "bg-white/40"}`} />
          ))}
        </div>
      </div>

      {/* ── Menu + Cart Sidebar ── */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-6 items-start">

      {/* Linke Spalte: Speisekarte */}
      <div className="flex-1 min-w-0 space-y-8">

        {/* Mittagsangebot */}
        {lunchOpen && (() => {
          const lunchSections = (["vegetarisch", "vegan", "haehnchen"] as const)
            .map(key => {
              const cfg = lunchConfig[key];
              if (!cfg.enabled || !cfg.categoryId) return null;
              const cat = menu.find(c => c.id === cfg.categoryId);
              if (!cat || cat.items.length === 0) return null;
              return { key, cat, price: cfg.price };
            })
            .filter(Boolean) as { key: string; cat: MenuCategory; price: number }[];

          if (lunchSections.length === 0) return null;

          return (
          <section id="lunch-section" ref={(el) => { categoryRefs.current["lunch-section"] = el; }}>
            <div className="flex items-center gap-2 mb-1">
              <h2 className={`text-xl font-bold ${D.text}`}>{tr.lunchTitle}</h2>
              <span className="bg-yellow-600 text-yellow-100 text-xs font-bold px-2 py-0.5 rounded-full">{lunchConfig.startTime}–{lunchConfig.endTime}</span>
            </div>
            <p className={`text-sm ${D.gold} font-medium mb-4`}>{tr.lunchSubtitle}</p>
            <div className="grid gap-3">
              {lunchSections.flatMap(({ cat, price }) =>
                cat.items.map(item => {
                  const cid = `lunch-${item.id}`;
                  const qty = getQty(cid);
                  return (
                    <div key={cid} className={`${D.surface} rounded-2xl p-4 border ${D.border} border-l-4 border-l-yellow-600 flex items-center gap-3`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap mb-0.5">
                          <span className={`text-xs ${D.muted} font-mono mr-1`}>{item.nr}</span>
                          <span className={`font-semibold ${D.text} text-sm`}>{iDe ? item.name : item.nameEn}</span>
                          {item.vegan && <Badge label="🌱 Vegan" color="bg-emerald-900 text-emerald-300" />}
                          {item.vegetarian && !item.vegan && <Badge label="🌿 Veg" color="bg-green-900 text-green-300" />}
                          {item.spicy ? <Spicy n={item.spicy} /> : null}
                          <Badge label="☀️ Mittag" color="bg-yellow-900/50 text-yellow-300" />
                        </div>
                        <p className={`text-xs ${D.muted} leading-snug mb-1`}>{iDe ? item.description : item.descriptionEn}</p>
                        <div className="flex items-center gap-2">
                          <p className={`${D.gold} font-bold text-sm`}>{formatEur(price)}</p>
                          <p className={`text-xs ${D.muted} line-through`}>{formatEur(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <>
                            <button onClick={() => updateQty(cid, -1)} className={`w-8 h-8 rounded-full ${D.surface2} ${D.text} font-bold hover:bg-[#3d2008]`}>−</button>
                            <span className={`w-4 text-center font-semibold text-sm ${D.text}`}>{qty}</span>
                          </>
                        )}
                        <button onClick={() => addLunch(item, price)} className={`w-8 h-8 rounded-full ${D.goldBg} text-[#0c0703] font-bold hover:bg-[#b8922e]`}>+</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
          );
        })()}

        {/* Tagesangebote */}
        {dailySpecialItems.length > 0 && (
          <section id="specials-section" ref={(el) => { categoryRefs.current["specials-section"] = el; }}>
            <h2 className={`text-xl font-bold ${D.text} mb-3`}>{tr.dailySpecials}</h2>
            <div className="grid gap-3">
              {dailySpecialItems.map((item) => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} className={`${D.surface} rounded-2xl p-4 border ${D.border} border-l-4 border-l-[#c9a23a] flex items-center gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-xs ${D.muted} font-mono mr-1`}>{item.nr}</span>
                        <span className={`font-semibold ${D.text} text-sm`}>{iDe ? item.name : item.nameEn}</span>
                        {item.vegetarian && !item.vegan && <Badge label="🌿" color="bg-green-900 text-green-300" />}
                        {item.vegan && <Badge label="🌱" color="bg-emerald-900 text-emerald-300" />}
                        {item.spicy && <Spicy n={item.spicy} />}
                        <Badge label="⭐ Special" color="bg-[#3d2008] text-[#c9a23a]" />
                      </div>
                      <p className={`text-xs ${D.muted} mt-0.5 leading-snug`}>{iDe ? item.description : item.descriptionEn}</p>
                      <p className={`${D.gold} font-bold text-sm mt-1`}>{formatEur(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 && (
                        <>
                          <button onClick={() => updateQty(item.id, -1)} className={`w-8 h-8 rounded-full ${D.surface2} ${D.text} font-bold hover:bg-[#3d2008]`}>−</button>
                          <span className={`w-4 text-center font-semibold text-sm ${D.text}`}>{qty}</span>
                        </>
                      )}
                      <button onClick={() => addFromMenu(item)} className={`w-8 h-8 rounded-full ${D.goldBg} text-[#0c0703] font-bold hover:bg-[#b8922e]`}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Reguläre Speisekarte */}
        {menu.map((cat: MenuCategory) => (
          <section key={cat.id} id={cat.id} ref={(el) => { categoryRefs.current[cat.id] = el; }}>
            <h2 className={`text-xl font-bold ${D.text} mb-0.5`}>{cat.emoji} {iDe ? cat.name : cat.nameEn}</h2>
            {(iDe ? cat.subtitle : cat.subtitleEn) && (
              <p className={`text-xs ${D.gold} italic mb-3`}>{iDe ? cat.subtitle : cat.subtitleEn}</p>
            )}
            {!(cat.subtitle || cat.subtitleEn) && <div className="mb-3" />}
            <div className="grid gap-2.5">
              {cat.items.map((item: MenuItem) => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} className={`${D.surface} rounded-xl p-3.5 border ${D.border} flex items-center gap-3 hover:border-[#c9a23a]/30 transition`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        {item.nr && <span className={`text-[10px] ${D.muted} font-mono bg-[#251508] px-1 rounded`}>{item.nr}</span>}
                        <span className={`font-semibold ${D.text} text-sm`}>{iDe ? item.name : item.nameEn}</span>
                        {item.vegetarian && !item.vegan && <Badge label="🌿" color="bg-green-900 text-green-300" />}
                        {item.vegan && <Badge label="🌱" color="bg-emerald-900 text-emerald-300" />}
                        {item.spicy && <Spicy n={item.spicy} />}
                      </div>
                      {(iDe ? item.description : item.descriptionEn) && (
                        <p className={`text-xs ${D.muted} leading-snug mb-1`}>{iDe ? item.description : item.descriptionEn}</p>
                      )}
                      <p className={`${D.gold} font-bold text-sm`}>{formatEur(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {qty > 0 && (
                        <>
                          <button onClick={() => updateQty(item.id, -1)} className={`w-7 h-7 rounded-full ${D.surface2} ${D.text} font-bold hover:bg-[#3d2008] text-sm`}>−</button>
                          <span className={`w-4 text-center font-semibold text-sm ${D.text}`}>{qty}</span>
                        </>
                      )}
                      <button onClick={() => addFromMenu(item)} className={`w-7 h-7 rounded-full ${D.goldBg} text-[#0c0703] font-bold hover:bg-[#b8922e] text-sm`}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>{/* Ende linke Spalte */}

      {/* ── Rechte Spalte: Warenkorb-Sidebar (Desktop) – fixed ── */}
      <div className="hidden lg:block w-80 shrink-0" />
      <div className={`hidden lg:flex flex-col fixed top-[108px] right-4 w-72 xl:w-80 z-20 ${D.surface} border ${D.border} rounded-2xl overflow-hidden shadow-xl`} style={{ maxHeight: "calc(100vh - 120px)" }}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${D.border} ${D.surface2}`}>
            <h2 className={`font-bold ${D.text} text-sm flex items-center gap-2`}>
              🛒 {iDe ? "Warenkorb" : "Cart"}
              {cartCount > 0 && (
                <span className={`${D.goldBg} text-[#1a0800] text-xs font-bold px-2 py-0.5 rounded-full`}>{cartCount}</span>
              )}
            </h2>
            {cartCount > 0 && (
              <button onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-300 transition font-medium">
                {iDe ? "Leeren" : "Clear"}
              </button>
            )}
          </div>

          {/* Leer */}
          {cart.length === 0 && (
            <div className={`text-center py-10 ${D.muted} text-sm`}>
              <div className="text-3xl mb-2">🛒</div>
              <p>{iDe ? "Noch nichts im Warenkorb" : "Cart is empty"}</p>
            </div>
          )}

          {/* Artikel */}
          {cart.length > 0 && (
            <>
              <div className="overflow-y-auto divide-y divide-[#3d1f08]" style={{ maxHeight: "calc(100vh - 320px)" }}>
                {cart.map((ci) => (
                  <div key={ci.cartId} className={`px-4 py-3 flex items-start gap-2`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${D.text} leading-snug`}>
                        {iDe ? ci.name : ci.nameEn}
                      </p>
                      <p className={`text-xs ${D.gold} font-bold mt-0.5`}>{formatEur(ci.price)}</p>
                    </div>
                    {/* +/- Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(ci.cartId, -1)}
                        className={`w-6 h-6 rounded-full ${D.surface2} ${D.text} text-xs font-bold hover:bg-[#6b3a12] transition flex items-center justify-center`}>
                        −
                      </button>
                      <span className={`w-5 text-center text-xs font-bold ${D.text}`}>{ci.qty}</span>
                      <button onClick={() => updateQty(ci.cartId, +1)}
                        className={`w-6 h-6 rounded-full ${D.goldBg} text-[#1a0800] text-xs font-bold hover:bg-[#b8922e] transition flex items-center justify-center`}>
                        +
                      </button>
                    </div>
                    {/* Preis + Löschen */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-bold ${D.text} whitespace-nowrap`}>{formatEur(ci.price * ci.qty)}</span>
                      <button onClick={() => removeItem(ci.cartId)}
                        className="text-[10px] text-red-400 hover:text-red-300 transition leading-none">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summe */}
              <div className={`border-t ${D.border} px-4 py-3 ${D.surface2}`}>
                <div className={`flex justify-between text-sm font-bold ${D.text} mb-3`}>
                  <span>{iDe ? "Gesamt" : "Total"}</span>
                  <span className={D.gold}>{formatEur(subtotal)}</span>
                </div>
                {vat7.gross > 0 && (
                  <div className={`flex justify-between text-[10px] ${D.muted} mb-1`}>
                    <span>{tr.vat7}</span><span>{formatEur(vat7.vat)}</span>
                  </div>
                )}
                <button onClick={() => setStep("checkout")}
                  className={`w-full ${D.btn} py-3 rounded-xl text-sm font-bold transition shadow-lg`}>
                  {iDe ? "Zur Kasse →" : "Checkout →"}
                </button>
              </div>
            </>
          )}
      </div>

      </div>{/* Ende max-w-6xl flex */}

      {/* Floating cart – nur auf Mobile sichtbar */}
      {cartCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 px-4 pb-5 pointer-events-none z-40">
          <button onClick={() => setStep("cart")}
            className={`pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-between ${D.goldBg} hover:bg-[#b8922e] text-[#0c0703] px-5 py-4 rounded-2xl shadow-2xl font-bold transition`}>
            <span className={`bg-[#b8922e] rounded-xl px-2 py-0.5 text-sm`}>{cartCount}</span>
            <span>{tr.toCart}</span>
            <span>{formatEur(subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
