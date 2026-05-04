"use client"

import Link from "next/link"
import { ORDER_STATUS } from "@/lib/constants"

// Mock data
const mockOrders = [
  { id: "FV-2026-00042", date: "02.05.2026", items: 3, total: "3.890,00 €", status: "processing", statusLabel: "In Bearbeitung" },
  { id: "FV-2026-00039", date: "28.04.2026", items: 1, total: "1.249,00 €", status: "shipped", statusLabel: "Versendet" },
  { id: "FV-2026-00035", date: "22.04.2026", items: 8, total: "8.720,00 €", status: "approved", statusLabel: "Genehmigt" },
  { id: "FV-2026-00030", date: "15.04.2026", items: 2, total: "560,00 €", status: "delivered", statusLabel: "Zugestellt" },
  { id: "FV-2026-00028", date: "10.04.2026", items: 1, total: "2.199,00 €", status: "delivered", statusLabel: "Zugestellt" },
  { id: "FV-2026-00025", date: "03.04.2026", items: 5, total: "4.450,00 €", status: "delivered", statusLabel: "Zugestellt" },
  { id: "FV-2026-00021", date: "28.03.2026", items: 2, total: "3.498,00 €", status: "cancelled", statusLabel: "Storniert" },
]

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-info",
  processing: "badge-warning",
  shipped: "badge-info",
  delivered: "badge-success",
  cancelled: "badge-danger",
}

export default function OrdersPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Bestellungen</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Alle Bestellungen Ihres Firmenkontos</p>
        </div>
        <Link href="/products" className="btn-primary">
          Neue Bestellung
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <button className="btn-primary text-sm">Alle</button>
        <button className="btn-secondary text-sm">Ausstehend</button>
        <button className="btn-secondary text-sm">In Bearbeitung</button>
        <button className="btn-secondary text-sm">Versendet</button>
        <button className="btn-secondary text-sm">Zugestellt</button>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-gray-50)]">
              <tr className="border-b border-[var(--color-gray-200)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Auftragsnr.</th>
                <th className="text-left py-3 px-4 font-medium text-[var(--color-gray-500)]">Datum</th>
                <th className="text-center py-3 px-4 font-medium text-[var(--color-gray-500)]">Positionen</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">Betrag</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">Status</th>
                <th className="text-right py-3 px-4 font-medium text-[var(--color-gray-500)]">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--color-gray-100)] hover:bg-[var(--color-gray-50)] transition-colors">
                  <td className="py-4 px-4">
                    <Link href={`/orders/${order.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                      {order.id}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-[var(--color-gray-600)]">{order.date}</td>
                  <td className="py-4 px-4 text-center">{order.items}</td>
                  <td className="py-4 px-4 text-right font-medium">{order.total}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`badge ${statusBadge[order.status] || "badge-gray"}`}>
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link href={`/orders/${order.id}`} className="text-sm text-[var(--color-accent)] hover:underline">
                      Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-[var(--color-gray-500)]">7 Bestellungen</p>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm" disabled>← Zurück</button>
          <button className="btn-secondary text-sm" disabled>Weiter →</button>
        </div>
      </div>
    </div>
  )
}