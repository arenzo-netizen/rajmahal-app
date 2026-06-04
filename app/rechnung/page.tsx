"use client";

import { useEffect, useState } from "react";
import type { Order } from "../api/orders/route";
import { formatEur } from "../lib/vatCalc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function RechnungPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("data");
    if (raw) {
      try {
        setOrder(JSON.parse(decodeURIComponent(raw)));
      } catch {
        setError("Ungültige Rechnungsdaten.");
      }
    } else {
      setError("Keine Bestelldaten übergeben.");
    }
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!order) return <div className="p-8 text-gray-500">Lade…</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Print button – hidden in print */}
      <div className="print:hidden bg-amber-50 px-6 py-4 flex gap-3">
        <button onClick={() => window.print()} className="bg-amber-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-amber-700">
          🖨️ Drucken / Als PDF speichern
        </button>
        <button onClick={() => window.close()} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-xl hover:bg-gray-50">
          Schließen
        </button>
      </div>

      {/* Invoice */}
      <div className="max-w-2xl mx-auto px-8 py-10 text-sm text-gray-800" id="invoice">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">Rajmahal</h1>
            <p className="text-gray-500 text-xs">Indisches Restaurant Schkeuditz</p>
            <p className="text-xs text-gray-500 mt-1">
              Friedrich-Ebert-Straße 16 · 04435 Schkeuditz<br />
              Tel. 0176 64 91 88 23<br />
              <em className="text-gray-400">[USt-IdNr. eintragen]</em>
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">Rechnung</h2>
            <p className="text-gray-500 text-xs mt-1">Bestell-Nr.: <strong>{order.id}</strong></p>
            <p className="text-gray-500 text-xs">Datum: {formatDate(order.timestamp)}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <p className="font-semibold">{order.customer.name}</p>
          <p className="text-gray-500">Tel.: {order.customer.phone}</p>
          {order.address && (
            <p className="text-gray-500">
              {order.address.street} {order.address.houseNr},&nbsp;
              {order.address.zip} {order.address.city}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {order.orderType === "pickup" ? "Abholung" : "Lieferung"}
            {order.paypalOrderId && ` · PayPal ${order.paypalOrderId}`}
          </p>
        </div>

        {/* Items */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="py-2 font-medium">Bezeichnung</th>
              <th className="py-2 text-center font-medium">Menge</th>
              <th className="py-2 text-right font-medium">Einzelpreis</th>
              <th className="py-2 text-right font-medium">MwSt.</th>
              <th className="py-2 text-right font-medium">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.qty}</td>
                <td className="py-2 text-right">{formatEur(item.price)}</td>
                <td className="py-2 text-right text-gray-500">{item.vatRate}%</td>
                <td className="py-2 text-right font-medium">{formatEur(item.price * item.qty)}</td>
              </tr>
            ))}
            {order.deliveryFee > 0 && (
              <tr className="border-b border-gray-100">
                <td className="py-2">Liefergebühr</td>
                <td className="py-2 text-center">1</td>
                <td className="py-2 text-right">{formatEur(order.deliveryFee)}</td>
                <td className="py-2 text-right text-gray-500">19%</td>
                <td className="py-2 text-right font-medium">{formatEur(order.deliveryFee)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-72 space-y-1">
            <div className="flex justify-between text-gray-500">
              <span>Zwischensumme</span>
              <span>{formatEur(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Liefergebühr</span>
                <span>{formatEur(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-1">
              <span>Gesamtbetrag</span>
              <span>{formatEur(order.total)}</span>
            </div>
          </div>
        </div>

        {/* VAT breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-xs">
          <p className="font-semibold mb-2 text-gray-700">MwSt.-Aufschlüsselung</p>
          <table className="w-full">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pb-1 font-medium">MwSt.-Satz</th>
                <th className="pb-1 text-right font-medium">Netto</th>
                <th className="pb-1 text-right font-medium">MwSt.</th>
                <th className="pb-1 text-right font-medium">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {order.vat7.gross > 0 && (
                <tr>
                  <td className="py-0.5">7% (Speisen)</td>
                  <td className="text-right">{formatEur(order.vat7.net)}</td>
                  <td className="text-right">{formatEur(order.vat7.vat)}</td>
                  <td className="text-right font-medium">{formatEur(order.vat7.gross)}</td>
                </tr>
              )}
              {order.vat19.gross > 0 && (
                <tr>
                  <td className="py-0.5">19% (Getränke / Lieferung)</td>
                  <td className="text-right">{formatEur(order.vat19.net)}</td>
                  <td className="text-right">{formatEur(order.vat19.vat)}</td>
                  <td className="text-right font-medium">{formatEur(order.vat19.gross)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-200 font-semibold">
                <td className="pt-1">Gesamt</td>
                <td className="text-right pt-1">{formatEur(order.vat7.net + order.vat19.net)}</td>
                <td className="text-right pt-1">{formatEur(order.vat7.vat + order.vat19.vat)}</td>
                <td className="text-right pt-1">{formatEur(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {order.note && (
          <p className="text-xs text-gray-500 mb-6">Anmerkung: {order.note}</p>
        )}

        <p className="text-center text-xs text-gray-400 mt-8 border-t pt-4">
          Vielen Dank für Ihre Bestellung! · Rajmahal Indisch Restaurant Schkeuditz · Friedrich-Ebert-Straße 16 · 04435 Schkeuditz
        </p>
      </div>

      <style>{`
        @media print {
          body { margin: 0; }
          #invoice { max-width: 100%; padding: 1.5cm; }
        }
      `}</style>
    </div>
  );
}
