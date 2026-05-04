"use client"

import { useState } from "react"
import Link from "next/link"

const mockCartItems = [
  { id: "1", title: "AWS 70.HI", subtitle: "Aluminium-Fenster", qty: 8, unitPrice: 389, discount: 5, lineTotal: 2956.40 },
  { id: "2", title: "LivIng 82", subtitle: "PVC-Fenster", qty: 12, unitPrice: 229, discount: 5, lineTotal: 2609.40 },
]

export default function CartPage() {
  const subtotal = mockCartItems.reduce((sum, i) => sum + i.lineTotal, 0)
  const taxRate = 0.19
  const tax = subtotal * taxRate
  const total = subtotal + tax
  const shipping = subtotal >= 2500 ? 0 : 89

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Warenkorb</h1>

      {mockCartItems.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--color-gray-500)] mb-4">Ihr Warenkorb ist leer.</p>
          <Link href="/products" className="btn-primary">Produkte durchsuchen</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {mockCartItems.map((item) => (
              <div key={item.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-[var(--color-gray-500)]">{item.subtitle}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-[var(--color-gray-500)]">Menge:</label>
                        <input type="number" defaultValue={item.qty} min={1}
                          className="input-field w-20 text-center" />
                      </div>
                      {item.discount > 0 && (
                        <span className="badge badge-success">{item.discount}% Rabatt</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-[var(--color-gray-500)]">
                      {item.unitPrice.toFixed(2).replace(".", ",")} € / Stk.
                    </p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {item.lineTotal.toFixed(2).replace(".", ",")} €
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--color-gray-100)] flex justify-end">
                  <button className="text-sm text-red-600 hover:underline">Entfernen</button>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Link href="/products" className="btn-secondary">← Weiter einkaufen</Link>
              <Link href="/quotes/new" className="btn-secondary">Als Angebot anfragen</Link>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card sticky top-8">
              <h3 className="font-semibold mb-4">Zusammenfassung</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-gray-500)]">Zwischensumme (netto)</span>
                  <span>{subtotal.toFixed(2).replace(".", ",")} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-gray-500)]">Versand</span>
                  <span>{shipping === 0 ? "Gratis" : `${shipping},00 €`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-gray-500)]">MwSt. (19%)</span>
                  <span>{tax.toFixed(2).replace(".", ",")} €</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-3 border-t border-[var(--color-gray-200)]">
                  <span>Gesamt</span>
                  <span className="text-[var(--color-primary)]">
                    {(total + shipping).toFixed(2).replace(".", ",")} €
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--color-gray-200)] space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Lieferadresse</label>
                  <select className="input-field text-sm">
                    <option>Hauptadresse — Opladener Str. 8, 50679 Köln</option>
                    <option>Baustelle Köln-Mülheim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gewünschte Lieferwoche</label>
                  <input type="text" className="input-field text-sm" placeholder="z.B. KW 28" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bemerkungen</label>
                  <textarea className="input-field text-sm" rows={2} placeholder="Optional" />
                </div>
              </div>

              {total > 2500 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    ⚠ Bestellwert über 2.500 € — Genehmigung durch Admin erforderlich
                  </p>
                </div>
              )}

              <Link href="/checkout" className="btn-primary w-full mt-4 block text-center">
                Zur Bestellung
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}