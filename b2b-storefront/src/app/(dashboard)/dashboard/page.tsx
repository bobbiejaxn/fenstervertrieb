"use client"

import { useAuthStore } from "@/lib/auth-store"
import Link from "next/link"
import { ROLES, COMPANY_STATUS } from "@/lib/constants"

// Mock data — will be replaced with Medusa API calls
const mockStats = {
  pendingQuotes: 3,
  openOrders: 7,
  openInvoices: 2,
  overdueInvoices: 0,
  creditUsed: 4200,
  creditLimit: 10000,
}

const mockRecentOrders = [
  { id: "FV-2026-00042", date: "02.05.2026", total: "3.890,00 €", status: "In Bearbeitung" },
  { id: "FV-2026-00039", date: "28.04.2026", total: "1.249,00 €", status: "Versendet" },
  { id: "FV-2026-00035", date: "22.04.2026", total: "8.720,00 €", status: "Genehmigt" },
  { id: "FV-2026-00030", date: "15.04.2026", total: "560,00 €", status: "Zugestellt" },
  { id: "FV-2026-00028", date: "10.04.2026", total: "2.199,00 €", status: "Zugestellt" },
]

export default function DashboardPage() {
  const { customer, companyRole, companyId } = useAuthStore()
  const isBuyer = companyRole === "buyer" || companyRole === "viewer"

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-gray-800)]">
          Willkommen, {customer?.first_name || "Kunde"}
        </h1>
        <p className="text-[var(--color-gray-500)] mt-1">
          {COMPANY_STATUS.approved} — Ihr Konto ist aktiv
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/quotes" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-[var(--color-gray-500)]">Offene Angebote</p>
          <p className="text-3xl font-bold text-[var(--color-primary)] mt-2">{mockStats.pendingQuotes}</p>
        </Link>
        <Link href="/orders" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-[var(--color-gray-500)]">Offene Bestellungen</p>
          <p className="text-3xl font-bold text-[var(--color-primary)] mt-2">{mockStats.openOrders}</p>
        </Link>
        <Link href="/invoices" className="card hover:shadow-md transition-shadow">
          <p className="text-sm text-[var(--color-gray-500)]">Offene Rechnungen</p>
          <p className="text-3xl font-bold text-[var(--color-warning)] mt-2">{mockStats.openInvoices}</p>
        </Link>
        <div className="card">
          <p className="text-sm text-[var(--color-gray-500)]">Kreditlimit</p>
          <p className="text-3xl font-bold text-[var(--color-gray-800)] mt-2">
            {mockStats.creditUsed.toLocaleString("de-DE")} €
          </p>
          <div className="mt-2">
            <div className="w-full bg-[var(--color-gray-200)] rounded-full h-2">
              <div
                className="bg-[var(--color-accent)] rounded-full h-2"
                style={{ width: `${(mockStats.creditUsed / mockStats.creditLimit) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-gray-500)] mt-1">
              von {mockStats.creditLimit.toLocaleString("de-DE")} € genutzt
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approvals (Admin only) */}
      {!isBuyer && (
        <div className="card mb-8 border-l-4 border-l-[var(--color-warning)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Ausstehende Genehmigungen</h3>
              <p className="text-sm text-[var(--color-gray-500)] mt-1">
                2 Bestellungen warten auf Ihre Freigabe
              </p>
            </div>
            <Link href="/approvals" className="btn-primary">
              Genehmigen
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/products" className="card flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Produkte durchsuchen</p>
            <p className="text-sm text-[var(--color-gray-500)]">Schüco Katalog</p>
          </div>
        </Link>

        <Link href="/configurator" className="card flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Konfigurator</p>
            <p className="text-sm text-[var(--color-gray-500)]">Individuelle Konfiguration</p>
          </div>
        </Link>

        <Link href="/quotes/new" className="card flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Angebot anfragen</p>
            <p className="text-sm text-[var(--color-gray-500)]">Projektanfrage stellen</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Letzte Bestellungen</h2>
          <Link href="/orders" className="text-sm text-[var(--color-accent)] hover:underline">
            Alle anzeigen →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-gray-200)]">
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">Auftragsnr.</th>
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">Datum</th>
                <th className="text-right py-3 font-medium text-[var(--color-gray-500)]">Betrag</th>
                <th className="text-right py-3 font-medium text-[var(--color-gray-500)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentOrders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--color-gray-100)] hover:bg-[var(--color-gray-50)]">
                  <td className="py-3 font-medium">{order.id}</td>
                  <td className="py-3 text-[var(--color-gray-600)]">{order.date}</td>
                  <td className="py-3 text-right font-medium">{order.total}</td>
                  <td className="py-3 text-right">
                    <span className={`badge ${
                      order.status === "Zugestellt" ? "badge-success" :
                      order.status === "Versendet" ? "badge-info" :
                      order.status === "In Bearbeitung" ? "badge-warning" :
                      "badge-gray"
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}