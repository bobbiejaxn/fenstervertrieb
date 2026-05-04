"use client"

import Link from "next/link"

// Mock pending approvals
const mockApprovals = [
  {
    id: "FV-2026-00043",
    buyer: "Markus Weber",
    buyerEmail: "markus@bau-gmbh.de",
    date: "03.05.2026",
    total: "4.890,00 €",
    items: 5,
    reason: "Bestellwert über Ausgabengrenze (2.500 €)",
    products: ["AWS 70.HI × 3", "ASE 60.HI × 2"],
  },
  {
    id: "FV-2026-00044",
    buyer: "Lisa Becker",
    buyerEmail: "lisa@bau-gmbh.de",
    date: "04.05.2026",
    total: "3.299,00 €",
    items: 2,
    reason: "Bestellwert über Ausgabengrenze (2.500 €)",
    products: ["ADS 90 × 2"],
  },
]

export default function ApprovalsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Genehmigungen</h1>
          <p className="text-[var(--color-gray-500)] mt-1">
            Bestellungen, die Ihre Freigabe benötigen
          </p>
        </div>
      </div>

      {mockApprovals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[var(--color-gray-500)]">Keine ausstehenden Genehmigungen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockApprovals.map((approval) => (
            <div key={approval.id} className="card border-l-4 border-l-[var(--color-warning)]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-[var(--color-gray-500)]">{approval.id}</span>
                    <span className="badge badge-warning">Genehmigung erforderlich</span>
                  </div>
                  <h3 className="font-semibold text-lg">{approval.total}</h3>
                  <p className="text-sm text-[var(--color-gray-500)] mt-1">
                    {approval.items} Positionen • {approval.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{approval.buyer}</p>
                  <p className="text-sm text-[var(--color-gray-500)]">{approval.buyerEmail}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--color-gray-200)]">
                <p className="text-sm text-[var(--color-warning)] font-medium mb-2">
                  ⚠ {approval.reason}
                </p>
                <div className="flex flex-wrap gap-2">
                  {approval.products.map((p) => (
                    <span key={p} className="badge badge-gray">{p}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button className="btn-primary">
                  ✓ Genehmigen
                </button>
                <button className="btn-danger">
                  ✗ Ablehnen
                </button>
                <Link href={`/orders/${approval.id}`} className="btn-secondary">
                  Details ansehen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900">Wie funktioniert die Genehmigung?</h3>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Einkäufer mit einem Ausgabenlimit unter dem Bestellwert benötigen Ihre Freigabe</li>
              <li>Sie erhalten eine E-Mail-Benachrichtigung bei jeder pendingen Bestellung</li>
              <li>Nach Genehmigung wird die Bestellung automatisch an den Vertrieb weitergeleitet</li>
              <li>Bei Ablehnung wird der Einkäufer per E-Mail informiert</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}