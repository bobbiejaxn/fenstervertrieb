"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuthStore } from "@/lib/auth-store"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
      router.push(redirectTo)
    } catch (err: any) {
      setError(err?.message || "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-gray-50)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">FB Fenstervertrieb</h1>
          <p className="text-[var(--color-gray-500)] mt-1">B2B Bestellportal</p>
        </div>

        {/* Login Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Anmelden</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-gray-700)] mb-1">
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@firma.de"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-gray-700)] mb-1">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-[var(--color-gray-600)]">Angemeldet bleiben</span>
              </label>
              <Link href="/forgot-password" className="text-[var(--color-accent)] hover:underline">
                Passwort vergessen?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Wird angemeldet…" : "Anmelden"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--color-gray-500)]">
            Noch kein Konto?{" "}
            <Link href="/register" className="text-[var(--color-accent)] hover:underline font-medium">
              Firma registrieren
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-gray-400)] mt-4">
          Schüco Partner • Fenster & Türen für Gewerbekunden
        </p>
      </div>
    </div>
  )
}