"use client"

import { useState } from "react"

export default function NewQuotePage() {
  const [step, setStep] = useState(1)
  const [projectName, setProjectName] = useState("")
  const [notes, setNotes] = useState("")
  const [deliveryWeek, setDeliveryWeek] = useState("")

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Angebot anfragen</h1>
        <p className="text-[var(--color-gray-500)] mt-1">
          Konfigurieren Sie Ihr Wunschprodukt und fordern Sie ein individuelles Angebot an
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: "Produkte" },
          { num: 2, label: "Projektdetails" },
          { num: 3, label: "Bestätigung" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s.num ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-gray-200)] text-[var(--color-gray-500)]"
            }`}>
              {step > s.num ? "✓" : s.num}
            </div>
            <span className={`text-sm ${step >= s.num ? "text-[var(--color-gray-800)]" : "text-[var(--color-gray-400)]"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {step === 1 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Produkte hinzufügen</h2>
              <p className="text-sm text-[var(--color-gray-500)] mb-4">
                Wählen Sie die Schüco-Produkte für Ihr Angebot aus
              </p>
              <div className="space-y-3">
                {["AWS 70.HI — Aluminium-Fenster", "AWS 90.SI+ — Passivhaus-Fenster", "LivIng 82 — PVC-Fenster", "ADS 75 — Haustür", "ASE 60.HI — Hebeschiebetür"].map((p, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 border border-[var(--color-gray-200)] rounded-lg hover:bg-[var(--color-gray-50)] cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-[var(--color-primary)]" />
                    <span className="font-medium">{p}</span>
                    <span className="text-sm text-[var(--color-gray-500)] ml-auto">Auf Anfrage</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setStep(2)} className="btn-primary">
                  Weiter — Projektdetails
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold">Projektdetails</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Projektname *</label>
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  className="input-field" placeholder="z.B. Bürogebäude Köln - Fensteraustausch" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Gewünschte Lieferwoche</label>
                <input type="text" value={deliveryWeek} onChange={(e) => setDeliveryWeek(e.target.value)}
                  className="input-field" placeholder="z.B. KW 28/2026" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bemerkungen / Sonderwünsche</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="input-field" rows={4}
                  placeholder="Beschreiben Sie Ihr Projekt, Besonderheiten, Maßanforderungen…" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Lieferadresse</label>
                <select className="input-field">
                  <option>Hauptadresse (aus Firmenprofil)</option>
                  <option>Andere Adresse…</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setStep(1)} className="btn-secondary">Zurück</button>
                <button onClick={() => setStep(3)} className="btn-primary">Weiter — Bestätigung</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Anfrage bestätigen</h2>
              <div className="space-y-4">
                <div className="bg-[var(--color-gray-50)] rounded-lg p-4">
                  <p className="font-medium">{projectName || "Projektname"}</p>
                  <p className="text-sm text-[var(--color-gray-500)] mt-1">
                    Lieferwoche: {deliveryWeek || "Nicht angegeben"}
                  </p>
                </div>
                {notes && (
                  <div>
                    <h3 className="font-medium mb-1">Bemerkungen</h3>
                    <p className="text-sm text-[var(--color-gray-600)]">{notes}</p>
                  </div>
                )}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Ihr Angebot wird innerhalb von 1-2 Werktagen erstellt. Sie erhalten eine E-Mail,
                    sobald das Angebot zum Download bereitsteht. Angebote sind 30 Tage gültig.
                  </p>
                </div>
                <div className="flex gap-3 justify-end mt-6">
                  <button onClick={() => setStep(2)} className="btn-secondary">Zurück</button>
                  <button className="btn-primary">Angebot anfragen</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div>
          <div className="card sticky top-8">
            <h3 className="font-semibold mb-3">Zusammenfassung</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-gray-500)]">Produkte</span>
                <span>5 ausgewählt</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-gray-500)]">Preis</span>
                <span className="font-medium text-[var(--color-primary)]">Auf Anfrage</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-gray-500)]">Gültigkeit</span>
                <span>30 Tage</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--color-gray-200)]">
              <p className="text-xs text-[var(--color-gray-500)]">
                Nach Eingang Ihrer Anfrage erstellt unser Vertrieb ein individuelles Angebot
                mit netten B2B-Preisen und Projektrabatten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}