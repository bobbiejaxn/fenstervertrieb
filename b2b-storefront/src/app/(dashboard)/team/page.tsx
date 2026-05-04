"use client"

import { useState } from "react"
import { ROLES, ROLE_DESCRIPTIONS, INVITE_STATUS } from "@/lib/constants"

const mockTeamMembers = [
  { id: "1", name: "Thomas Müller", email: "thomas@bau-gmbh.de", role: "owner" as const, status: "active", lastLogin: "02.05.2026" },
  { id: "2", name: "Sarah Schmidt", email: "sarah@bau-gmbh.de", role: "admin" as const, status: "active", lastLogin: "01.05.2026" },
  { id: "3", name: "Markus Weber", email: "markus@bau-gmbh.de", role: "buyer" as const, status: "active", lastLogin: "28.04.2026" },
  { id: "4", name: "Lisa Becker", email: "lisa@bau-gmbh.de", role: "buyer" as const, status: "inactive", lastLogin: "15.04.2026" },
]

export default function TeamPage() {
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "buyer" | "viewer">("buyer")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team verwalten</h1>
          <p className="text-[var(--color-gray-500)] mt-1">Mitglieder einladen, Rollen zuweisen</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary">
          Mitglied einladen
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Mitglied einladen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-Mail-Adresse</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="vorname.nachname@firma.de"
                />
                <p className="text-xs text-[var(--color-gray-500)] mt-1">
                  Firmen-E-Mail erforderlich. Einladung ist 7 Tage gültig.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rolle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="input-field"
                >
                  <option value="admin">Admin — Team verwalten, Genehmigungen</option>
                  <option value="buyer">Einkäufer — Produkte, Warenkorb, Bestellen</option>
                  <option value="viewer">Betrachter — Nur Lesezugriff</option>
                </select>
                <p className="text-xs text-[var(--color-gray-500)] mt-1">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowInvite(false)} className="btn-secondary flex-1">
                  Abbrechen
                </button>
                <button onClick={() => { /* TODO: call API */ setShowInvite(false) }} className="btn-primary flex-1">
                  Einladung senden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-gray-200)]">
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">Mitglied</th>
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">E-Mail</th>
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">Rolle</th>
                <th className="text-left py-3 font-medium text-[var(--color-gray-500)]">Letzter Login</th>
                <th className="text-right py-3 font-medium text-[var(--color-gray-500)]">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {mockTeamMembers.map((member) => (
                <tr key={member.id} className="border-b border-[var(--color-gray-100)] hover:bg-[var(--color-gray-50)]">
                  <td className="py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-medium">
                        {member.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      {member.name}
                      {member.status === "inactive" && (
                        <span className="badge badge-gray">Inaktiv</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-[var(--color-gray-600)]">{member.email}</td>
                  <td className="py-3">
                    <span className={`badge ${
                      member.role === "owner" ? "badge-info" :
                      member.role === "admin" ? "badge-warning" :
                      member.role === "buyer" ? "badge-success" :
                      "badge-gray"
                    }`}>
                      {ROLES[member.role]}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--color-gray-500)]">{member.lastLogin}</td>
                  <td className="py-3 text-right">
                    {member.role !== "owner" && (
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-xs text-[var(--color-accent)] hover:underline">
                          Rolle ändern
                        </button>
                        <button className="text-xs text-red-600 hover:underline">
                          Deaktivieren
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Legend */}
      <div className="mt-8 card">
        <h3 className="font-semibold mb-4">Rollen & Berechtigungen</h3>
        <div className="space-y-3">
          {(Object.entries(ROLE_DESCRIPTIONS) as [string, string][]).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3">
              <span className={`badge ${
                role === "owner" ? "badge-info" :
                role === "admin" ? "badge-warning" :
                role === "buyer" ? "badge-success" :
                "badge-gray"
              }`}>
                {ROLES[role as keyof typeof ROLES]}
              </span>
              <p className="text-sm text-[var(--color-gray-600)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}