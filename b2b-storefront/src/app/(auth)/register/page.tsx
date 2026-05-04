"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FREE_EMAIL_DOMAINS } from "@/lib/constants"

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1=Company, 2=Admin, 3=Verify
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Company fields
  const [companyName, setCompanyName] = useState("")
  const [vatId, setVatId] = useState("")
  const [industry, setIndustry] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [zip, setZip] = useState("")
  const [country, setCountry] = useState("DE")

  // Admin fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const isBusinessEmail = (e: string) => {
    const domain = e.split("@")[1]?.toLowerCase()
    return domain && !FREE_EMAIL_DOMAINS.includes(domain)
  }

  const verifyVatId = async (vat: string): Promise<boolean> => {
    // EU VIES validation
    try {
      const res = await fetch(
        `https://ec.europa.eu/taxation_customs/vies/restApi/ms/${vat.substring(0, 2)}/vat/${vat.substring(2)}`,
      )
      const data = await res.json()
      return data?.valid === true
    } catch {
      // If VIES is down, accept format check
      return /^([A-Z]{2}[0-9A-Z]{2,12})$/.test(vat.replace(/\s/g, ""))
    }
  }

  const handleStep1 = () => {
    setError("")
    if (!companyName || !vatId || !street || !city || !zip) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }
    setStep(2)
  }

  const handleStep2 = async () => {
    setError("")
    if (!firstName || !lastName || !email || !password) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.")
      return
    }
    if (!isBusinessEmail(email)) {
      setError("Bitte verwenden Sie eine Firmen-E-Mail-Adresse (kein GMX, Gmail, etc.).")
      return
    }
    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }
    if (password.length < 12) {
      setError("Das Passwort muss mindestens 12 Zeichen lang sein.")
      return
    }

    setLoading(true)
    try {
      // TODO: Call backend registration API
      // For now, show verification step
      setStep(3)
    } catch (err: any) {
      setError(err?.message || "Registrierung fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  const industries = [
    { value: "", label: "Branche wählen…" },
    { value: "contractor", label: "Bauträger / Generalunternehmer" },
    { value: "architect", label: "Architekt / Planungsbüro" },
    { value: "craftsman", label: "Handwerksbetrieb (Fenster/Türen)" },
    { value: "wholesaler", label: "Großhandel" },
    { value: "developer", label: "Projektentwickler" },
    { value: "other", label: "Sonstiges" },
  ]

  const countries = [
    { value: "DE", label: "Deutschland" },
    { value: "AT", label: "Österreich" },
    { value: "CH", label: "Schweiz" },
    { value: "ES", label: "Spanien" },
    { value: "IT", label: "Italien" },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)] py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">FB Fenstervertrieb</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Firmenkonto erstellen</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { num: 1, label: "Firmendaten" },
            { num: 2, label: "Admin-Account" },
            { num: 3, label: "Verifizierung" },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.num
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-gray-200)] text-[var(--color-gray-500)]"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </div>
              <span className={`text-sm ${step >= s.num ? "text-[var(--color-gray-800)]" : "text-[var(--color-gray-400)]"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); handleStep1() }} className="space-y-4">
              <h2 className="text-lg font-semibold">Firmeninformationen</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Firmenname *</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                  className="input-field" placeholder="Musterbau GmbH" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">USt-IdNr. *</label>
                <input type="text" value={vatId} onChange={(e) => setVatId(e.target.value.toUpperCase())}
                  className="input-field" placeholder="DE123456789" required />
                <p className="text-xs text-[var(--color-gray-500)] mt-1">
                  Wird automatisch über die EU-VIES-Datenbank geprüft
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Branche</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="input-field">
                  {industries.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Straße & Hausnr. *</label>
                <input type="text" value={street} onChange={(e) => setStreet(e.target.value)}
                  className="input-field" placeholder="Musterstraße 1" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">PLZ *</label>
                  <input type="text" value={zip} onChange={(e) => setZip(e.target.value)}
                    className="input-field" placeholder="50679" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ort *</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="input-field" placeholder="Köln" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Land</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="input-field">
                  {countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <button type="submit" className="btn-primary w-full">
                Weiter — Admin-Account erstellen
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleStep2() }} className="space-y-4">
              <h2 className="text-lg font-semibold">Admin-Account</h2>
              <p className="text-sm text-[var(--color-gray-500)]">
                Als erster Benutzer werden Sie automatisch <strong>Company Owner</strong> mit Vollzugriff.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Vorname *</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nachname *</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="input-field" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Firmen-E-Mail *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field" placeholder="vorname.nachname@firma.de" required />
                <p className="text-xs text-[var(--color-gray-500)] mt-1">
                  Keine Freemailer (Gmail, GMX, etc.) — Firmen-E-Mail erforderlich
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefon *</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="input-field" placeholder="+49 221 123456" required />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Passwort *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-field" placeholder="Min. 12 Zeichen" required minLength={12} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Passwort bestätigen *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field" required minLength={12} />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1">
                  Zurück
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Wird erstellt…" : "Firmenkonto erstellen"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Fast fertig!</h2>
              <p className="text-[var(--color-gray-600)] mb-6">
                Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
                Bitte klicken Sie den Link, um Ihr Konto zu verifizieren.
              </p>
              <p className="text-sm text-[var(--color-gray-500)] mb-4">
                Nach der Verifizierung prüfen wir Ihre Daten und schalten Ihr Konto frei.
                Sie erhalten eine E-Mail, sobald Ihr Konto aktiv ist.
              </p>
              <Link href="/login" className="btn-primary inline-block">
                Zur Anmeldung
              </Link>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-center text-sm text-[var(--color-gray-500)] mt-4">
            Schon registriert?{" "}
            <Link href="/login" className="text-[var(--color-accent)] hover:underline">
              Anmelden
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}