import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "FB Fenstervertrieb — B2B Portal",
  description: "Schüco Fenster & Türen — B2B Bestellportal für Gewerbekunden",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-primary)] text-white flex items-center justify-center">
      <div className="text-center max-w-2xl px-8">
        <h1 className="text-4xl font-bold mb-4">FB Fenstervertrieb</h1>
        <p className="text-xl opacity-90 mb-8">B2B Bestellportal für Schüco Fenster & Türen</p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="bg-white text-[var(--color-primary)] px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Anmelden
          </a>
          <a href="/register" className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors">
            Firma registrieren
          </a>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold">500+</p>
            <p className="text-sm opacity-75 mt-1">Produkte</p>
          </div>
          <div>
            <p className="text-3xl font-bold">10+</p>
            <p className="text-sm opacity-75 mt-1">Jahre Erfahrung</p>
          </div>
          <div>
            <p className="text-3xl font-bold">★4.9</p>
            <p className="text-sm opacity-75 mt-1">Kundenbewertung</p>
          </div>
        </div>
      </div>
    </div>
  )
}