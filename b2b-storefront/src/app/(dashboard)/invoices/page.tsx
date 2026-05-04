"use client"

import Link from "next/link"

// Mock invoices
const mockInvoices = [
  { id: "RE-2026-0038", orderId: "FV-2026-00035", date: "24.04.2026", dueDate: "24.05.2026", total: "8.720,00 €", status: "open", daysLeft: 20 },
  { id: "RE-2026-0037", orderId: "FV-2026-00030", date: "18.04.2026", dueDate: "18.05.2026", total: "560,00 €", status: "open", daysLeft: 14 },
  { id: "RE-2026-0030", orderId: "FV-2026-00025", date: "05.04.2026", dueDate: "05.05.2026", total: "4.450,00 €", status: "paid", paidDate: "28.04.2026" },
  { id: "RE-2026-0028", orderId: "FV-2026-00021", date: "30.03.2026", dueDate: "29.04.2026", total: "3.498,00 €", status: "cancelled" },
  { id: "RE-2026-0025", orderId: "FV-2026-00018", date: "15.03.2026", dueDate: "14.04.2026", total: "11.200,00 €", status: "paid", paidDate: "10.04.2026" },
  { id: "RE-2026-0020", orderId: "FV-2026-00012", date: "28.02.2026", dueDate: "30.03.2026", total: "2.199,00 €", status: "paid", paidDate: "25.03.2026" },
]

const statusLabel: Record<string, string> = {
  open: "Offen",
  paid: "Bezahlt",
  overdue: "Überfällig",
  cancelled: "Storniert",
}

const statusBadge: Record<string, string> = {
  open: "badge-warning",
  paid: "badge-success",
  overdue: "badge-danger",
  cancelled: "badge-gray",
}

export default function InvoicesPage() {
  const totalOpen = "9.280,00 €"
  const totalOverdue = "0,00 €"

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rechnungen</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Rechnungsübersicht und Zahlungen</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-[var(--color-gray-500)]">Offene Rechnungen</p>
          <p className="text-2xl font-bold text-[var(--color-warning)] mt-2">{totalOpen}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--color-gray-500)]">Überfällig</p>
          <p className="text-2xl font-bold text-[var(--color-danger)] mt-2">{totalOverdue}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--color-gray-500)]">Zahlungsbedingungen</p>
          <p className="text-2xl font-bold text-[var(--color-gray-800)] mt-2">Net 30</p>
          <p className="text-xs text-[var(--color-gray-500)] mt-1">Zahlung innerhalb 30 Tage</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-gray-50)]">
              <tr className="border-b border-[var(--color-gray-200)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Rechnungsnr.</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Auftrag</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Datum</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Fällig</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">Betrag</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">Status</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">PDF</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-[var(--color-gray-100)] hover:bg-[var(--color-gray-50)] transition-colors">
                  <td className="py-4 px-4 font-medium">{inv.id}</td>
                  <td className="py-4 px-4">
                    <Link href={`/orders/${inv.orderId}`} className="text-[var(--color-accent)] hover:underline">
                      {inv.orderId}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-[var(--color-gray-600)]">{inv.date}</td>
                  <td className="py-4 px-4">
                    <span className="text-[var(--color-gray-600)]">{inv.dueDate}</span>
                    {inv.daysLeft !== undefined && inv.daysLeft > 0 && (
                      <span className="text-xs text-[var(--color-gray-400)] ml-2">({inv.daysLeft} Tage)</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">{inv.total}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`badge ${statusBadge[inv.status]}`}>
                      {statusLabel[inv.status]}
                    </span>
                    {inv.paidDate && (
                      <p className="text-xs text-[var(--color-gray-400)] mt-1">am {inv.paidDate}</p>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="text-sm text-[var(--color-accent)] hover:underline">
                      📄 Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mt-8 card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900">Bankverbindung</h3>
            <p className="text-sm text-blue-700 mt-1">
              FB Fenstervertrieb GmbH • IBAN: DE89 3704 0044 0532 0130 00 • BIC: COBADEFFXXX
            </p>
            <p className="text-sm text-blue-700">
              Verwendungszweck: Bitte Rechnungsnummer angeben
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}