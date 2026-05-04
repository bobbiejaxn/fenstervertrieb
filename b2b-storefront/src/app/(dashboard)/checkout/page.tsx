"use client"

import { useState } from "react"
import Link from "next/link"

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState("invoice")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [placing, setPlacing] = useState(false)

  const subtotal = 5565.80
  const shipping = 0
  const tax = subtotal * 0.19
  const total = subtotal + tax + shipping

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bestellung abschließen</h1>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {["Warenkorb", "Bestellung", "Bestätigung"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i <= 1 ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-gray-200)] text-[var(--color-gray-500)]"
            }`}>{i + 1}</div>
            <span className={`text-sm ${i <= 1 ? "font-medium" : "text-[var(--color-gray-400)]"}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Delivery Address */}
        <div className="card">
          <h2 className="font-semibold mb-4">Lieferadresse</h2>
          <div className="p-3 bg-[var(--color-gray-50)] rounded-lg">
            <p className="font-medium">Musterbau GmbH</p>
            <p className="text-sm text-[var(--color-gray-600)]">Opladener Str. 8</p>
            <p className="text-sm text-[var(--color-gray-600)]">50679 Köln</p>
            <p className="text-sm text-[var(--color-gray-600)]">Deutschland</p>
          </div>
        </div>

        {/* Shipping */}
        <div className="card">
          <h2 className="font-semibold mb-4">Lieferung</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-[var(--color-gray-200)] rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="radio" name="shipping" defaultChecked className="text-[var(--color-primary)]" />
                <div>
                  <p className="font-medium">Standardlieferung</p>
                  <p className="text-sm text-[var(--color-gray-500)]">5-10 Werktage</p>
                </div>
              </div>
              <span className="font-medium">Gratis</span>
            </label>
            <label className="flex items-center justify-between p-3 border border-[var(--color-gray-200)] rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <input type="radio" name="shipping" className="text-[var(--color-primary)]" />
                <div>
                  <p className="font-medium">Expresslieferung</p>
                  <p className="text-sm text-[var(--color-gray-500)]">2-3 Werktage (ab 500 € Bestellwert)</p>
                </div>
              </div>
              <span className="font-medium">149,00 €</span>
            </label>
          </div>
        </div>

        {/* Payment */}
        <div className="card">
          <h2 className="font-semibold mb-4">Zahlungsmethode</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border border-[var(--color-gray-200)] rounded-lg cursor-pointer">
              <input type="radio" name="payment" checked={paymentMethod === "invoice"}
                onChange={() => setPaymentMethod("invoice")} className="text-[var(--color-primary)]" />
              <div>
                <p className="font-medium">Rechnung — Net 30</p>
                <p className="text-sm text-[var(--color-gray-500)]">Zahlung innerhalb 30 Tage nach Rechnungsdatum</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-[var(--color-gray-200)] rounded-lg cursor-pointer">
              <input type="radio" name="payment" checked={paymentMethod === "prepaid"}
                onChange={() => setPaymentMethod("prepaid")} className="text-[var(--color-primary)]" />
              <div>
                <p className="font-medium">Vorkasse</p>
                <p className="text-sm text-[var(--color-gray-500)]">Banküberweisung vor Lieferung</p>
              </div>
            </label>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card">
          <h2 className="font-semibold mb-4">Bestellübersicht</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>AWS 70.HI × 8 (Staffelpreis 5%)</span>
              <span>2.956,40 €</span>
            </div>
            <div className="flex justify-between">
              <span>LivIng 82 × 12 (Staffelpreis 5%)</span>
              <span>2.609,40 €</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-medium">
              <span>Zwischensumme (netto)</span>
              <span>5.565,80 €</span>
            </div>
            <div className="flex justify-between">
              <span>Versand</span>
              <span>Gratis</span>
            </div>
            <div className="flex justify-between">
              <span>MwSt. (19%)</span>
              <span>1.057,50 €</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold text-base">
              <span>Gesamt</span>
              <span className="text-[var(--color-primary)]">6.623,30 €</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 rounded border-gray-300" />
            <p className="text-sm text-[var(--color-gray-600)]">
              Ich akzeptiere die <a href="#" className="text-[var(--color-accent)] underline">AGB</a> und{" "}
              <a href="#" className="text-[var(--color-accent)] underline">Datenschutzerklärung</a>. 
              Die Bestellung ist nach Freigabe durch den Firmen-Admin verbindlich.
            </p>
          </label>
        </div>

        {/* Submit */}
        <button
          disabled={!termsAccepted || placing}
          className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {placing ? "Bestellung wird aufgegeben…" : "Kostenpflichtig bestellen"}
        </button>

        <p className="text-xs text-center text-[var(--color-gray-400)]">
          Die Bestellung wird nach Freigabe durch den Firmen-Admin verbindlich.
          Sie erhalten eine E-Mail-Bestätigung.
        </p>
      </div>
    </div>
  )
}