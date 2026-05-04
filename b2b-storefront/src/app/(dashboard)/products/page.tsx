"use client"

import { useState } from "react"
import Link from "next/link"
import { ORDER_STATUS } from "@/lib/constants"

// Mock products — will come from Medusa API
const mockProducts = [
  {
    id: "1", handle: "aws-70-hi", title: "AWS 70.HI",
    subtitle: "Premium Aluminium-Fenster mit Wärmedämmung",
    category: "Aluminium-Fenster", price: "389,00 €", priceFrom: true,
    specs: { "Uf-Wert": "1,1 – 2,0 W/m²K", "Schalldämmung": "Bis Rw 45 dB", "Einbautiefe": "70 mm" },
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  },
  {
    id: "2", handle: "aws-90-si-plus", title: "AWS 90.SI+",
    subtitle: "Super-isoliertes Passivhaus-Aluminium-Fenster",
    category: "Aluminium-Fenster", price: "549,00 €", priceFrom: false,
    specs: { "Uf-Wert": "0,8 – 1,3 W/m²K", "Schalldämmung": "Bis Rw 48 dB", "Einbautiefe": "90 mm" },
    image: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400&q=80",
  },
  {
    id: "3", handle: "living-82", title: "LivIng 82",
    subtitle: "7-Kammer-PVC-Fenster mit höchster Wärmedämmung",
    category: "PVC-Fenster", price: "229,00 €", priceFrom: false,
    specs: { "Uw-Wert": "0,67 W/m²K", "Schalldämmung": "Bis Rw 46 dB", "Kammersystem": "7-Kammer" },
    image: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=400&q=80",
  },
  {
    id: "4", handle: "ads-75", title: "ADS 75",
    subtitle: "Aluminium-Haustürsystem mit thermischer Trennung",
    category: "Haustüren", price: "1.299,00 €", priceFrom: true,
    specs: { "Ud-Wert": "1,2 – 1,8 W/m²K", "Einbautiefe": "75 mm" },
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
  },
  {
    id: "5", handle: "ase-60-hi", title: "ASE 60.HI",
    subtitle: "Hebeschiebetür mit Wärmedämmung",
    category: "Schiebetüren", price: "899,00 €", priceFrom: true,
    specs: { "Uf-Wert": "1,4 – 2,2 W/m²K", "Bodenschwelle": "Schwellenlos", "Einbautiefe": "60 mm" },
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
  },
  {
    id: "6", handle: "ctb-30-hi", title: "CTB 30.HI",
    subtitle: "Pfosten-Riegel-Fassade für Objektbau",
    category: "Fassaden", price: "449,00 €", priceFrom: true,
    specs: { "Uf-Wert": "1,2 – 2,0 W/m²K", "Windlast": "Bis 2400 Pa" },
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
  },
]

const categories = ["Alle", "Aluminium-Fenster", "PVC-Fenster", "Haustüren", "Schiebetüren", "Fassaden"]

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState("Alle")
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = mockProducts.filter((p) => {
    const matchesCategory = selectedCategory === "Alle" || p.category === selectedCategory
    const matchesSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Produkte</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Schüco Produktkatalog — B2B Preise</p>
        </div>
        <Link href="/configurator" className="btn-primary">
          Konfigurator öffnen
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Produkt suchen…"
          className="input-field w-64"
        />
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-gray-100)] text-[var(--color-gray-600)] hover:bg-[var(--color-gray-200)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.handle}`}
            className="card hover:shadow-lg transition-shadow group"
          >
            <div className="aspect-video bg-[var(--color-gray-100)] rounded-lg overflow-hidden mb-4">
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-wide">
                {product.category}
              </span>
              <h3 className="text-lg font-semibold mt-1">{product.title}</h3>
              <p className="text-sm text-[var(--color-gray-500)] mt-1">{product.subtitle}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xl font-bold text-[var(--color-primary)]">
                  {product.priceFrom ? "ab " : ""}{product.price}
                </span>
                <span className="text-sm text-[var(--color-gray-400)]">Netto/ Stück</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--color-gray-100)]">
              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-gray-500)]">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Bulk Pricing Info */}
      <div className="mt-8 card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-blue-900">B2B Staffelpreise</h3>
            <p className="text-sm text-blue-700 mt-1">
              Gewerbekunden profitieren von automatischen Staffelpreisen:
              1-9 Stück Listenpreis • 10-49 Stück 5% Rabatt • 50+ Stück 10% Rabatt • 100+ Stück auf Anfrage
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Kundenindividuelle Preise werden nach Freigabe Ihres Firmenkontos angezeigt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}