"use client"

import { useState } from "react"
import { ROLES, ROLE_DESCRIPTIONS, PAYMENT_TERMS } from "@/lib/constants"

export default function CompanyPage() {
  const [editing, setEditing] = useState(false)

  // Mock company data
  const company = {
    name: "Musterbau GmbH",
    vatId: "DE123456789",
    street: "Opladener Str. 8",
    city: "Köln",
    zip: "50679",
    country: "DE",
    industry: "Bauträger",
    creditLimit: 10000,
    paymentTerms: "net_30" as const,
    status: "approved",
    memberCount: 4,
    openOrders: 7,
    totalSpent: "47.890,00 €",
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Firmenprofil</h1>
          <p className="text-[var(--color-gray-500)] mt-1">{company.name}</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-primary">
            Profil bearbeiten
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="btn-secondary">Abbrechen</button>
            <button onClick={() => setEditing(false)} className="btn-primary">Speichern</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Firmendaten</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">Firmenname</label>
                {editing ? (
                  <input type="text" defaultValue={company.name} className="input-field" />
                ) : (
                  <p className="font-medium">{company.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">USt-IdNr.</label>
                <p className="font-medium">{company.vatId} ✓</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">Straße</label>
                {editing ? (
                  <input type="text" defaultValue={company.street} className="input-field" />
                ) : (
                  <p>{company.street}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">PLZ / Ort</label>
                {editing ? (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" defaultValue={company.zip} className="input-field" />
                    <input type="text" defaultValue={company.city} className="input-field col-span-2" />
                  </div>
                ) : (
                  <p>{company.zip} {company.city}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">Branche</label>
                <p>{company.industry}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-gray-500)] mb-1">Status</label>
                <span className="badge badge-success">Freigegeben</span>
              </div>
            </div>
          </div>

          {/* Delivery Addresses */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Lieferadressen</h2>
              <button className="btn-secondary text-sm">+ Adresse hinzufügen</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-[var(--color-gray-200)] rounded-lg">
                <div>
                  <p className="font-medium">Hauptadresse <span className="badge badge-info ml-2">Standard</span></p>
                  <p className="text-sm text-[var(--color-gray-500)]">{company.street}, {company.zip} {company.city}</p>
                </div>
                <button className="text-sm text-[var(--color-accent)] hover:underline">Bearbeiten</button>
              </div>
              <div className="flex items-center justify-between p-3 border border-[var(--color-gray-200)] rounded-lg">
                <div>
                  <p className="font-medium">Baustelle Köln-Mülheim</p>
                  <p className="text-sm text-[var(--color-gray-500)]">Wiethasestr. 13-15, 51063 Köln</p>
                </div>
                <button className="text-sm text-red-600 hover:underline">Entfernen</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Konto-Übersicht</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-gray-500)]">Team-Mitglieder</span>
                <span className="font-medium">{company.memberCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-gray-500)]">Offene Orders</span>
                <span className="font-medium">{company.openOrders}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-gray-500)]">Gesamtausgaben</span>
                <span className="font-medium">{company.totalSpent}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Kredit & Zahlung</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[var(--color-gray-500)] mb-1">Kreditlimit</label>
                <p className="text-xl font-bold">{company.creditLimit.toLocaleString("de-DE")} €</p>
                <div className="w-full bg-[var(--color-gray-200)] rounded-full h-2 mt-2">
                  <div className="bg-[var(--color-accent)] rounded-full h-2" style={{ width: "42%" }} />
                </div>
                <p className="text-xs text-[var(--color-gray-400)] mt-1">4.200 € von 10.000 € genutzt</p>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-gray-500)] mb-1">Zahlungsbedingungen</label>
                <p className="font-medium">{PAYMENT_TERMS[company.paymentTerms]}</p>
              </div>
            </div>
          </div>

          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2 text-sm">Ansprechpartner</h3>
            <p className="text-sm">FB Fenstervertrieb GmbH</p>
            <p className="text-sm text-[var(--color-gray-500)]">info@fenstervertrieb.de</p>
            <p className="text-sm text-[var(--color-gray-500)]">+49 221 65074856</p>
          </div>
        </div>
      </div>
    </div>
  )
}