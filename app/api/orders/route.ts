import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import nodemailer from "nodemailer";

// Next.js: immer dynamisch rendern, nie cachen
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Konfiguration ────────────────────────────────────────────────────────────
const ORDERS_FILE  = path.join(process.cwd(), "data", "orders.json");
const ADMIN_PIN    = process.env.ADMIN_PIN    ?? "rajmahal2024";

const SMTP_HOST    = process.env.SMTP_HOST    ?? "";
const SMTP_PORT    = Number(process.env.SMTP_PORT   ?? "587");
const SMTP_SECURE  = process.env.SMTP_SECURE  === "true";
const SMTP_USER    = process.env.SMTP_USER    ?? "";
const SMTP_PASS    = process.env.SMTP_PASS    ?? "";
const MAIL_TO      = process.env.MAIL_TO      ?? "";
const MAIL_FROM    = process.env.MAIL_FROM    ?? SMTP_USER;
const RESEND_KEY   = process.env.RESEND_API_KEY ?? "";

// ─── Vercel KV / Upstash REST-API ─────────────────────────────────────────────
// Vercel KV (alt) oder Upstash Marketplace – beide Varianten werden unterstützt.
// Lokal leer lassen → Fallback auf JSON-Datei.
const KV_URL   = process.env.KV_REST_API_URL        ?? process.env.UPSTASH_REDIS_REST_URL   ?? "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN       ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
const useKv    = !!(KV_URL && KV_TOKEN);
const KV_KEY   = "rajmahal:orders";

/** Führt einen Redis-Befehl via Upstash REST-Pipeline aus */
async function kvCmd(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store" as RequestCache,
  });
  if (!res.ok) throw new Error(`KV HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as [{ result: unknown }];
  return data[0]?.result;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VatBreakdown { net: number; vat: number; gross: number; }

export interface OrderItem {
  id: string; name: string; price: number; qty: number; vatRate: 7 | 19;
}

export interface Order {
  id: string;
  timestamp: string;
  orderType: "pickup" | "delivery";
  customer: { name: string; phone: string; email?: string };
  address?: { street: string; houseNr: string; zip: string; city: string };
  items: OrderItem[];
  note?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  vat7: VatBreakdown;
  vat19: VatBreakdown;
  paypalOrderId?: string;
  lang: "de" | "en";
}

// ─── Storage ──────────────────────────────────────────────────────────────────
async function readOrders(): Promise<Order[]> {
  // ── Vercel KV (Produktion) ──
  if (useKv) {
    try {
      const items = (await kvCmd(["LRANGE", KV_KEY, 0, -1])) as string[];
      return (items ?? [])
        .map((s) => { try { return JSON.parse(s) as Order; } catch { return null; } })
        .filter(Boolean) as Order[];
    } catch (e) {
      console.error("KV readOrders Fehler:", e);
      return [];
    }
  }
  // ── Lokale Entwicklung: JSON-Datei ──
  try {
    return JSON.parse(await fs.readFile(ORDERS_FILE, "utf-8")) as Order[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("readOrders (Datei) Fehler:", e);
    }
    return [];
  }
}

async function appendOrder(order: Order): Promise<void> {
  // ── Vercel KV ──
  if (useKv) {
    await kvCmd(["RPUSH", KV_KEY, JSON.stringify(order)]);
    return;
  }
  // ── Lokale JSON-Datei ──
  const orders = await readOrders();
  orders.push(order);
  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

/** Fortlaufende Bestellnummer ab 260001 */
async function nextOrderId(orders: Order[]): Promise<string> {
  const START = 260001;
  const max = orders.reduce((m, o) => {
    const n = parseInt(o.id, 10);
    return !isNaN(n) && n >= START ? Math.max(m, n) : m;
  }, START - 1);
  return String(max + 1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toFixed(2).replace(".", ",") + " €"; }

// ─── A4-Druck-HTML ────────────────────────────────────────────────────────────
function buildHtml(order: Order, forCustomer: boolean): string {
  const isCash = order.paypalOrderId === "CASH";
  const isDelivery = order.orderType === "delivery";
  const date = new Date(order.timestamp).toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
  const addressText = isDelivery && order.address
    ? `${order.address.street} ${order.address.houseNr}, ${order.address.zip} ${order.address.city}`
    : "Abholung · Friedrich-Ebert-Str. 16, 04435 Schkeuditz";

  const rows = order.items.map((i) => `
    <tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e0d5">${i.qty}×</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e0d5">${i.name}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e0d5;text-align:right;white-space:nowrap;color:#7a3a00">${fmt(i.price)} / Stk.</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e0d5;text-align:right;font-weight:600;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Bestellung #${order.id} – Rajmahal Schkeuditz</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0a00;background:#fff;margin:0;padding:20px}
  .page{max-width:700px;margin:0 auto;border:1px solid #d4a017;border-radius:8px;overflow:hidden}
  @media print{body{padding:0}.page{max-width:100%;border:none;border-radius:0}.no-print{display:none!important}}
  @page{size:A4 portrait;margin:15mm}
  .hd{background:#2a1505;color:#f5e8cc;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start}
  .hd h1{margin:0;font-size:22px;color:#c9a23a;letter-spacing:.04em}
  .hd .sub{font-size:11px;color:#a08060;margin-top:3px}
  .hd .nr{text-align:right;font-size:11px;color:#c9a23a}
  .hd .nr strong{font-size:16px;display:block}
  .meta{padding:14px 24px;background:#fdf6e8;border-bottom:1px solid #e5d5a0}
  .meta table{width:100%;border-collapse:collapse}
  .meta td{padding:3px 6px;font-size:12px}
  .meta td:first-child{color:#7a5a00;width:120px;font-weight:600}
  .items{padding:14px 24px}
  .items h2{margin:0 0 8px;font-size:13px;color:#2a1505;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #c9a23a;padding-bottom:4px}
  .items table{width:100%;border-collapse:collapse;font-size:12.5px}
  .items th{background:#2a1505;color:#c9a23a;padding:6px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .items th:last-child,.items th:nth-child(3){text-align:right}
  .totals{padding:0 24px 14px;background:#fdf6e8}
  .totals table{width:100%;border-collapse:collapse;font-size:12.5px;max-width:320px;margin-left:auto}
  .totals td{padding:4px 8px}
  .totals td:last-child{text-align:right;font-weight:600}
  .totals .grand td{border-top:2px solid #c9a23a;font-weight:700;font-size:14px;color:#2a1505;padding-top:6px}
  .totals .vat{font-size:11px;color:#8a6a3a}
  .ft{background:#2a1505;color:#a08060;font-size:10px;padding:10px 24px;text-align:center}
  .ft a{color:#c9a23a}
  .print-btn{display:block;margin:16px auto;padding:10px 28px;background:#c9a23a;color:#1a0800;font-weight:bold;border:none;border-radius:6px;cursor:pointer;font-size:13px}
</style>
</head>
<body>
<div class="page">
  <div class="hd">
    <div>
      <h1>🍛 RAJMAHAL</h1>
      <div class="sub">Indisches Restaurant · Friedrich-Ebert-Str. 16 · 04435 Schkeuditz<br>Tel. 034204–360529 · 0176–64 91 88 23</div>
    </div>
    <div class="nr"><strong>#${order.id}</strong>${forCustomer ? "Ihre Bestellung" : "Bestelleingang"}</div>
  </div>
  <div class="meta">
    <table>
      <tr><td>Datum</td><td>${date}</td><td style="width:50%"></td></tr>
      <tr><td>Bestellart</td><td>${isDelivery ? "🚴 Lieferung" : "🏪 Abholung"}</td></tr>
      <tr><td>Zahlung</td><td>${isCash ? (isDelivery ? "💵 Bar bei Lieferung" : "💵 Bar bei Abholung") : `💳 PayPal (${order.paypalOrderId ?? ""})`}</td></tr>
      <tr><td>Kunde</td><td><strong>${order.customer.name}</strong> · ${order.customer.phone}</td></tr>
      ${order.customer.email ? `<tr><td>E-Mail</td><td>${order.customer.email}</td></tr>` : ""}
      <tr><td>${isDelivery ? "Lieferadresse" : "Abholadresse"}</td><td>${addressText}</td></tr>
      ${order.note ? `<tr><td>Hinweis</td><td><em>${order.note}</em></td></tr>` : ""}
    </table>
  </div>
  <div class="items">
    <h2>Bestellte Artikel</h2>
    <table>
      <thead><tr><th style="width:36px">Anz.</th><th>Artikel</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamt</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="totals">
    <table>
      <tr><td>Zwischensumme</td><td>${fmt(order.subtotal)}</td></tr>
      ${isDelivery ? `<tr><td>Liefergebühr</td><td>${fmt(order.deliveryFee)}</td></tr>` : ""}
      <tr class="grand"><td>Gesamtbetrag</td><td>${fmt(order.total)}</td></tr>
      <tr class="vat"><td style="padding-top:6px">inkl. MwSt. 7 %</td><td style="padding-top:6px">${fmt(order.vat7.vat)}</td></tr>
      <tr class="vat"><td>inkl. MwSt. 19 %</td><td>${fmt(order.vat19.vat)}</td></tr>
    </table>
  </div>
  <div class="ft">
    Rajmahal Schkeuditz · Friedrich-Ebert-Str. 16 · 04435 Schkeuditz ·
    <a href="https://www.rajmahal-schkeuditz.de">rajmahal-schkeuditz.de</a>
    ${forCustomer ? "<br>Vielen Dank für Ihre Bestellung! Guten Appetit 🙏" : ""}
  </div>
</div>
<div class="no-print" style="text-align:center">
  <button class="print-btn" onclick="window.print()">🖨️ Jetzt drucken / Als PDF speichern</button>
</div>
</body>
</html>`;
}

// ─── E-Mail ───────────────────────────────────────────────────────────────────
async function sendOrderMail(order: Order): Promise<void> {
  const isDelivery = order.orderType === "delivery";
  const subject = `🍛 Bestellung #${order.id} – ${fmt(order.total)} – ${isDelivery ? "Lieferung" : "Abholung"}`;

  // ── Resend (Vercel / Produktion) ──────────────────────────────────────────
  if (RESEND_KEY) {
    const resendFrom = MAIL_FROM
      ? `Rajmahal Schkeuditz <${MAIL_FROM}>`
      : "Rajmahal Schkeuditz <onboarding@resend.dev>";

    const send = async (to: string, subj: string, html: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: resendFrom, to: [to], subject: subj, html }),
        cache: "no-store" as RequestCache,
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    };

    if (MAIL_TO) await send(MAIL_TO, `[NEU] ${subject}`, buildHtml(order, false));
    if (order.customer.email) {
      await send(
        order.customer.email,
        `Ihre Bestellung #${order.id} – Rajmahal Schkeuditz`,
        buildHtml(order, true),
      );
    }
    return;
  }

  // ── Nodemailer SMTP (lokale Entwicklung) ──────────────────────────────────
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_TO) {
    console.warn("Kein E-Mail-Service konfiguriert – E-Mail wird nicht gesendet.");
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: `"Rajmahal Online-Bestellung" <${MAIL_FROM}>`,
    to: MAIL_TO,
    subject: `[NEU] ${subject}`,
    html: buildHtml(order, false),
    text: `Neue Bestellung #${order.id} von ${order.customer.name} · ${fmt(order.total)}`,
  });
  if (order.customer.email) {
    await transporter.sendMail({
      from: `"Rajmahal Schkeuditz" <${MAIL_FROM}>`,
      to: order.customer.email,
      subject: `Ihre Bestellung #${order.id} – Rajmahal Schkeuditz`,
      html: buildHtml(order, true),
      text: `Ihre Bestellung #${order.id} wurde aufgegeben. Gesamt: ${fmt(order.total)}`,
    });
  }
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const order: Order = await req.json();
    if (!order.id || !order.timestamp) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    const orders = await readOrders();
    order.id = await nextOrderId(orders);
    await appendOrder(order);
    sendOrderMail(order).catch((err) => console.error("Mail-Fehler:", err));
    return NextResponse.json({ ok: true, id: order.id });
  } catch (e) {
    console.error("POST /api/orders Fehler:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ─── GET /api/orders?pin=xxx ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin");
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await readOrders();
  return NextResponse.json(orders);
}
