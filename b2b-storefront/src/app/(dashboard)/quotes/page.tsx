"use client"

import { useState } from "react"
import Link from "next/link"

type QuoteStatus = "draft" | "submitted" | "reviewed" | "accepted" | "rejected" | "expired"
const statusLabel: Record<QuoteStatus, string> = {
  draft: "Entwurf",
  submitted: "Eingereicht",
  reviewed: "Geprüft",
  accepted: "Akzeptiert",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
}
const statusBadge: Record<QuoteStatus, string> = {
  draft: "badge-gray",
  submitted: "badge-warning",
  reviewed: "badge-info",
  accepted: "badge-success",
  rejected: "badge-danger",
  expired: "badge-danger",
}

const mockQuotes = [
  { id: "ANG-2026-0012", title: "Bürogebäude Köln - Fensteraustausch", project: "Rheinbau GmbH", date: "01.05.2026", validUntil: "31.05.2026", total: "12.490,00 €", status: "submitted" as QuoteStatus, items: 4 },
  { id: "ANG-2026-0011", title: "Wohnanlage München - Terrassentüren", project: "MünchBau AG", date: "28.04.2026", validUntil: "28.05.2026", total: "8.999,00 €", status: "reviewed" as QuoteStatus, items: 6 },
  { id: "ANG-2026-0010", title: "Villa Düsseldorf - Panoramafenster", project: "Privat", date: "22.04.2026", validUntil: "22.05.2026", total: "5.498,00 €", status: "accepted" as QuoteStatus, items: 3 },
  { id: "ANG-2026-0009", title: "Schule Berlin - Fassadensanierung", project: "Land Berlin", date: "15.03.2026", validUntil: "14.04.2026", total: "45.200,00 €", status: "expired" as QuoteStatus, items: 12 },
  { id: "ANG-2026-0008", title: "Hotel Hamburg - Schiebetüren", project: "Hotelkette Nord", date: "10.03.2026", validUntil: "09.04.2026", total: "3.600,00 €", status: "rejected" as QuoteStatus, items: 2 },
]

export default function QuotesPage() {
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all"
    ? mockQuotes
    : mockQuotes.filter((q) => q.status === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Angebote</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Angebotsanfragen und Offerten</p>
        </div>
        <Link href="/quotes/new" className="btn-primary">
          Neues Angebot anfragen
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "all", label: "Alle" },
          { key: "submitted", label: "Eingereicht" },
          { key: "reviewed", label: "Geprüft" },
          { key: "accepted", label: "Akzeptiert" },
          { key: "rejected", label: "Abgelehnt" },
          { key: "expired", label: "Abgelaufen" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)] hover:bg-[var(--color-gray-200)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {filtered.map((quote) => (
          <Link key={quote.id} href={`/quotes/${quote.id}`} className="card hover:shadow-md transition-shadow block">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-mono text-[var(--color-gray-500)]">{quote.id}</span>
                  <span className={`badge ${statusBadge[quote.status]}`}>
                    {statusLabel[quote.status]}
                  </span>
                </div>
                <h3 className="font-semibold text-[var(--color-gray-800)]">{quote.title}</h3>
                <p className="text-sm text-[var(--color-gray-500)] mt-1">{quote.project} • {quote.items} Positionen</p>
              </div>
              <div className="text-right ml-4">
                <p className="text-lg font-bold text-[var(--color-primary)]">{quote.total}</p>
                <p className="text-xs text-[var(--color-gray-500)]">
                  Gültig bis {quote.validUntil}
                </p>
                {quote.status === "submitted" && (
                  <p className="text-xs text-[var(--color-warning)] mt-1">⏳ Wird geprüft</p>
                )}
                {quote.status === "expired" && (
                  <p className="text-xs text-[var(--color-danger)] mt-1">⚠️ Abgelaufen</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-[var(--color-gray-500)]">Keine Angebote gefunden.</p>
          <Link href="/quotes/new" className="btn-primary mt-4 inline-block">
            Angebot anfragen
          </Link>
        </div>
      )}
    </div>
  )
}