"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ROLES } from "@/lib/constants"

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [inviterName, setInviterName] = useState("")
  const [role, setRole] = useState("")

  // Step 2 fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    // TODO: Validate invite token via API
    // Mock for now
    if (token) {
      setValid(true)
      setCompanyName("Musterbau GmbH")
      setInviterName("Thomas Müller")
      setRole("Einkäufer")
    }
    setLoading(false)
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-gray-500)]">Einladung wird geprüft…</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)]">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-semibold mb-4">Ungültiger Einladungslink</h2>
          <p className="text-[var(--color-gray-500)] mb-4">
            Dieser Einladungslink ist nicht gültig. Bitte kontaktieren Sie Ihren Administrator.
          </p>
          <Link href="/login" className="btn-primary">Zur Anmeldung</Link>
        </div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)]">
        <div className="card max-w-md text-center">
          <h2 className="text-xl font-semibold mb-4">Einladung abgelaufen</h2>
          <p className="text-[var(--color-gray-500)] mb-4">
            Diese Einladung ist nicht mehr gültig (7 Tage Gültigkeit).
            Bitte kontaktieren Sie Ihren Administrator für eine neue Einladung.
          </p>
          <Link href="/login" className="btn-primary">Zur Anmeldung</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) {
      setError("Die Passwörter stimmen nicht überein.")
      return
    }
    if (password.length < 12) {
      setError("Das Passwort muss mindestens 12 Zeichen lang sein.")
      return
    }
    // TODO: Call API to accept invite
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)] py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">FB Fenstervertrieb</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Einladung akzeptieren</p>
        </div>

        <div className="card">
          {/* Invite info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>{inviterName}</strong> hat Sie eingeladen, dem Firmenkonto
              <strong> {companyName}</strong> als <strong>{role}</strong> beizutreten.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-semibold">Ihr Konto erstellen</h2>

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
              <label className="block text-sm font-medium mb-1">Passwort *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field" placeholder="Min. 12 Zeichen" required minLength={12} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Passwort bestätigen *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field" required minLength={12} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              Einladung akzeptieren & Konto erstellen
            </button>
          </form>

          <p className="text-xs text-[var(--color-gray-400)] mt-4 text-center">
            Sie werden automatisch zur Firma <strong>{companyName}</strong> hinzugefügt.
          </p>
        </div>
      </div>
    </div>
  )
}