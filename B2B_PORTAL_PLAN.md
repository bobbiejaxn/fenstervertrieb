# FB Fenstervertrieb — B2B Portal Masterplan

## 1. Situationsanalyse

### Ist-Zustand
| Komponente | Status | Problem |
|-----------|--------|---------|
| Astro Marketing-Site | ✅ Live (nginx/static) | Keine dynamische Funktionalität |
| Medusa v2 Backend | ⚠️ Code existiert, DB leer | Container nicht laufend, nie geseedet |
| PostgreSQL | ✅ Läuft | 0 Tabellen — ungenutzt |
| Redis | ✅ Läuft | Unbenutzt |
| B2B Features | ❌ Nicht existent | Keine Firmenaccounts, keine Rollen, kein Checkout |

### Kernproblem
Die Astro-Site ist ein reines Marketing-Brochure. B2B-Kunden können **nichts** tun — kein Login, keine Preise sehen, nicht bestellen, keine Angebote anfragen, kein Team verwalten.

---

## 2. Architektur

### Übersicht
```
fenstervertrieb.de (Marketing)     app.fenstervertrieb.de (B2B Portal)
        │                                    │
   Astro Static                        Next.js 15 + Medusa UI
   (nginx, Port 3099)                 (Port 3100)
        │                                    │
        └──────────────┬─────────────────────┘
                       │
                Medusa v2 Backend
                (Port 9002)
                       │
              ┌────────┴────────┐
         PostgreSQL:5433    Redis:6380
```

### Warum Next.js für das B2B Portal?
- Medusa UI (Admin Dashboard) basiert auf Next.js
- `@medusajs/nextjs-starter` als Basis — bereits Account, Checkout, Cart integriert
- SSR für SEO + dynamische Preise (B2B-spezifisch)
- Real-time Updates via Server Components

### Warum Astro bestehen bleibt?
- Perfekt für Marketing-Seiten (SEO, Performance)
- Konfigurator funktioniert als Static + Client-side JS
- Blog, Legal, Referenzen — kein Backend nötig
- Cross-Link: "Jetzt bestellen" → `app.fenstervertrieb.de`

---

## 3. B2B User Flows — Vollständige Abdeckung

### 3.1 Registration & Onboarding

```
[Firmen-Registrierung]
┌─────────────────────────────────────────────────────┐
│ Step 1: Firmeninformationen                          │
│  - Firmenname *                                      │
│  - USt-IdNr. * (EU VAT Validation API)              │
│  - Land (DE, ES, IT, AT, CH) *                      │
│  - Adresse *                                         │
│  - Branche (Bauträger, Architekt, Handwerker, etc.) │
│                                                      │
│ Step 2: Admin-Account                                │
│  - Vorname / Nachname *                              │
│  - E-Mail * (Firmen-E-Mail, keine free providers)    │
│  - Telefon *                                         │
│  - Passwort *                                        │
│                                                      │
│ Step 3: Verifizierung                                │
│  - E-Mail Verification Link                          │
│  - Admin manuelle Freigabe (B2B → nicht auto-approve)│
│  - Status: "Pending" → Email Bestätigung             │
│                                                      │
│ Nach Freigabe durch Admin:                           │
│  - Willkommens-E-Mail mit Login-Link                 │
│  - Automatisch: Customer Group "B2B" zugewiesen     │
│  - Automatisch: Firmenkonto erstellt                 │
│  - Admin-User als "Company Owner" Rolle              │
└─────────────────────────────────────────────────────┘
```

**Edge Cases:**
- USt-IdNr ungültig → Fehlermeldung mit Hinweis
- E-Mail bereits registriert → "Ein Account mit dieser E-Mail existiert bereits. Loggen Sie sich ein oder kontaktieren Sie Ihren Admin."
- Firmen-E-Mail erforderlich (kein gmail.com, yahoo.de, etc.) → Validierung
- Doppelte Firmenanmeldung → Admin muss manuell prüfen
- Account abgelehnt → E-Mail mit Begründung + "Kontaktieren Sie uns"

### 3.2 Login & Auth

```
[Login]
┌──────────────────────────────────────┐
│ E-Mail + Passwort                     │
│                                      │
│ Nach Login:                           │
│  - Prüfung: Account freigegeben?      │
│    NEIN → "Ihr Account wartet auf     │
│           Freigabe. Wir informieren    │
│ Sie per E-Mail."                      │
│    JA → Redirect zum Dashboard       │
│                                      │
│ Passwort vergessen:                   │
│  - E-Mail mit Reset-Link (24h gültig)│
│  - Nach Reset:强制 neues Passwort     │
│                                      │
│ Session Management:                   │
│  - JWT + HttpOnly Cookie              │
│  - Session Timeout: 8h               │
│  - "Angemeldet bleiben" = 30 Tage    │
│  - Gleichzeitige Sessions: max 3     │
│  - Automatischer Logout bei Inaktivität│
└──────────────────────────────────────┘
```

**Edge Cases:**
- Account gesperrt (Admin hat deaktiviert) → "Ihr Account wurde deaktiviert. Bitte kontaktieren Sie uns."
- 3 falsche Login-Versuche → 15min Lockout + E-Mail Benachrichtigung
- Passwort abgelaufen (Policy: 90 Tage) → Zwangs-Reset
- E-Mail nicht verifiziert → "Bitte verifizieren Sie Ihre E-Mail. Link erneut senden."

### 3.3 Company Dashboard

```
[Firmen-Dashboard — Sicht: Company Owner / Admin]
┌──────────────────────────────────────────────────────┐
│ Übersicht                                             │
│  - Offene Angebote (x)                               │
│  - Offene Bestellungen (x)                            │
│  - Rechnungen offen (x) / Überfällig (x)             │
│  - Letzte Bestellungen (Tabelle, last 5)             │
│  - Ausstehende Genehmigungen (wenn Genehmigungsflow)  │
│                                                       │
│ Team verwalten (nur Owner/Admin)                       │
│  - Mitgliederliste: Name, E-Mail, Rolle, Status      │
│  - Mitglied einladen (E-Mail → Invite Link)          │
│  - Rolle ändern (Viewer → Buyer → Admin)             │
│  - Mitglied deaktivieren                             │
│  - Einladung widerrufen                             │
│                                                       │
│ Firmenprofil                                          │
│  - Firmenname, Adresse, USt-IdNr.                    │
│  - Rechnungsadresse (abweichend möglich)              │
│  - Lieferadressen (mehrere möglich)                   │
│  - Zahlungsbedingungen (Net 30, Net 60, Vorkasse)    │
│  - Ansprechpartner                                   │
│                                                       │
│ Ausgabengrenzen                                       │
│  - Pro-Buyer Limit (z.B. 5.000€ pro Bestellung)     │
│  - Monatliches Budget (z.B. 50.000€)                │
│  - Genehmigungsschwelle (ab X€ → Admin-Genehmigung) │
└──────────────────────────────────────────────────────┘
```

### 3.4 Team-Management & Rollen

```
[Rollen-System]
┌──────────────────────────────────────────────────────────┐
│ Company Owner                                             │
│  - Alles (Firmenprofil, Team, Ausgaben, alle Orders)     │
│  - Einzige Rolle die Owner-Wechsel durchführen kann      │
│  - Kann Firma löschen (Anfrage an Admin)                 │
│                                                           │
│ Admin                                                     │
│  - Team verwalten (einladen, Rollen, deaktivieren)       │
│  - Ausgabengrenzen setzen                                │
│  - Alle Orders einsehen + genehmigen                     │
│  - Firmenprofil bearbeiten                               │
│  - Kein Owner-Wechsel                                    │
│                                                           │
│ Buyer                                                     │
│  - Produkte durchsuchen + in den Warenkorb               │
│  - Angebote erstellen                                    │
│  - Bestellungen aufgeben (innerhalb Ausgabengrenze)      │
│  - Eigene Orders einsehen                                │
│  - Kein Team-Management                                 │
│  - Über Limit → muss genehmigt werden                   │
│                                                           │
│ Viewer                                                    │
│  - Produkte durchsuchen (nur B2B-Preise sichtbar)       │
│  - Orders einsehen (read-only)                           │
│  - Kein Warenkorb / Bestellung                           │
│  - Kein Team-Management                                  │
└──────────────────────────────────────────────────────────┘

[Einladungs-Flow]
Admin → "Mitglied einladen" → E-Mail eingeben + Rolle wählen
  → System sendet Einladungs-E-Mail mit Token-Link
  → Empfänger klickt Link → Registrierungs-Page (Firma vorausgefüllt)
  → Nach Registrierung → automatisch zur Firmen-Gruppe hinzugefügt
  → Einladungs-Token: 7 Tage gültig
  → Falls bereits registriert → direkt zur Firma hinzugefügt

Edge Cases:
  - Einladung abgelaufen → "Einladung nicht mehr gültig. Kontaktieren Sie Ihren Admin."
  - E-Mail gehört bereits anderer Firma → Admin muss manuell klären
  - Owner verlässt Firma → muss Owner an jemand anderen übergeben
  - Letzter Admin deaktiviert sich → System verhindert (mindestens 1 Admin)
```

### 3.5 Produktkatalog & B2B-Preise

```
[B2B Katalog]
┌──────────────────────────────────────────────────────────┐
│ Katalog-Sicht (nach Login)                               │
│  - Produkte mit B2B-Preisen (nicht für Guest sichtbar)  │
│  - Staffelpreise:                                       │
│    1-9 Stück: Listenpreis                                │
│    10-49: 5% Rabatt                                     │
│    50+: 10% Rabatt                                      │
│    100+: Custom (Anfrage)                              │
│  - Kundenindividuelle Preise (Customer Group Pricing)   │
│  - "Auf Anfrage" bei großen Systemen (Fassaden)        │
│                                                          │
│ Konfigurator (bestehend, erweitert):                     │
│  - Konfiguration → automatischer Preis berechnet        │
│  - "Als Angebot speichern" Button                       │
│  - "In den Warenkorb" Button                            │
│  - PDF-Export der Konfiguration                         │
│                                                          │
│ Produktvergleich:                                       │
│  - Bis 3 Produkte vergleichen                           │
│  - U-Werte, Preise, Features nebeneinander             │
└──────────────────────────────────────────────────────────┘
```

### 3.6 Warenkorb & Checkout

```
[Checkout-Flow B2B]
┌──────────────────────────────────────────────────────────┐
│ Warenkorb                                                │
│  - Produkte mit Mengen (Staffelpreise automatisch)      │
│  - Lieferadresse wählen (aus Firmenadressen)            │
│  - Gewünschte Lieferwoche (nicht exaktes Datum)         │
│  - Bemerkungen / Sonderwünsche                          │
│  - Zusammenfassung: Netto, MwSt, Versand, Gesamt        │
│                                                          │
│ Genehmigungs-Check:                                      │
│  IF Bestellwert > Ausgabengrenze des Buyers:             │
│    → Bestellung wird als "Genehmigung erforderlich"     │
│    → Admin bekommt E-Mail + In-App Benachrichtigung     │
│    → Buyer sieht "Wartet auf Genehmigung"              │
│  ELSE:                                                   │
│    → Direkt zur Zahlung / Bestellbestätigung            │
│                                                          │
│ Zahlung:                                                 │
│  - Option A: Rechnung (Net 30/60, nach Freigabe)        │
│  - Option B: Vorkasse (Banküberweisung)                 │
│  - Option C: Kreditkarte (Stripe, für kleinere Orders)  │
│  - Zahlungsmethode in Firmen-Profil hinterlegt           │
│                                                          │
│ Bestellbestätigung:                                      │
│  - Auftragsnummer (FV-2026-XXXXX)                       │
│  - E-Mail an Buyer + CC an Admin                        │
│  - PDF Auftragsbestätigung zum Download                 │
│  - Voraussichtliche Lieferwoche                          │
│  - "Bestellung ist verbindlich nach Freigabe"           │
└──────────────────────────────────────────────────────────┘
```

### 3.7 Angebots-Flow (Quote)

```
[Angebotsanfrage]
┌──────────────────────────────────────────────────────────┐
│ Szenario: B2B-Kunde will ein Angebot, nicht direkt       │
│ bestellen (typisch für große Projekte)                   │
│                                                          │
│ Flow:                                                    │
│ 1. Buyer konfiguriert Produkte im Konfigurator           │
│ 2. "Angebot anfragen" statt "In den Warenkorb"           │
│ 3. Weitere Infos: Projektname, Baustelle, Zeitrahmen    │
│ 4. Angebot wird erstellt (Status: "Draft")               │
│ 5. Admin (Fenstervertrieb) bekommt Benachrichtigung      │
│ 6. Admin erstellt offizielles Angebot im Medusa Backend │
│ 7. Buyer bekommt E-Mail: "Ihr Angebot ist bereit"       │
│ 8. Buyer sieht Angebot im Portal                        │
│ 9. Buyer kann Angebot akzeptieren → wird zur Bestellung │
│ 10. Buyer kann Angebot ablehnen / Änderung anfragen     │
│                                                          │
│ Angebot enthält:                                         │
│  - Positionen mit Mengen und Preisen                    │
│  - Gültigkeitsdauer (30 Tage)                           │
│  - Lieferzeitrahmen                                     │
│  - Zahlungsbedingungen                                  │
│  - PDF-Export                                           │
└──────────────────────────────────────────────────────────┘
```

### 3.8 Order Management

```
[Bestellverwaltung]
┌──────────────────────────────────────────────────────────┐
│ Buyer-Sicht:                                             │
│  - Meine Bestellungen (Liste mit Status)                 │
│  - Details: Positionen, Preise, Tracking                │
│  - Lieferscheine (PDF Download)                          │
│  - Rechnungen (PDF Download)                             │
│  - Retoure / Reklamation einleiten                       │
│  - Wiederbestellung (Reorder) mit einem Klick           │
│                                                          │
│ Admin-Sicht (Firma):                                     │
│  - Alle Bestellungen der Firma                           │
│  - Filter: Genehmigung ausstehend                       │
│  - Genehmigen / Ablehnen                                 │
│  - Kommentare bei Ablehnung                             │
│                                                          │
│ Bestellstati:                                            │
│  Pending → Approved → Processing → Shipped → Delivered  │
│  Cancelled (vor Versand)                                 │
│  Returned (Reklamation)                                  │
│                                                          │
│ Tracking:                                                │
│  - Spediteur + Tracking-Nummer                          │
│  - E-Mail Benachrichtigung bei Statuswechsel            │
└──────────────────────────────────────────────────────────┘
```

### 3.9 Rechnungen & Zahlungen

```
[Rechnungswesen]
┌──────────────────────────────────────────────────────────┐
│ Rechnungs-Übersicht:                                     │
│  - Offene Rechnungen (Net 30/60 Fälligkeit)             │
│  - Bezahlte Rechnungen                                   │
│  - Überfällige Rechnungen (rot markiert)                 │
│  - Gesamtsumme offen                                     │
│                                                          │
│ Zahlungsarten:                                           │
│  - Rechnung: Zahlung innerhalb 30/60 Tage               │
│    → Erinnerung_E-Mail automatisiert bei -7, 0, +7 Tagen│
│  - Vorkasse: Bankverbindung + Verwendungszweck         │
│    → Manuelle Bestätigung im Backend nach Zahlungseingang│
│  - Stripe: Kreditkarte für Kleinbestellungen             │
│                                                          │
│ Kreditlimit:                                             │
│  - Admin setzt Credit Limit pro Firma                    │
│  - Offene Rechnungen + neuer Auftrag > Limit → Fehler   │
│  - "Kreditlimit erreicht. Bitte Rechnungen begleichen    │
│    oder kontaktieren Sie uns."                           │
│                                                          │
│ PDF-Rechnungen:                                          │
│  - Automatisch generiert nach Versand                   │
│  - Firmendaten, Steuernummer, USt-IdNr.                 │
│  - SEPA-Bankverbindung                                   │
│  - QR-Code für Überweisung (EPC-QR)                    │
└──────────────────────────────────────────────────────────┘
```

### 3.10 E-Mail Benachrichtigungen

```
[E-Mail-System]
┌──────────────────────────────────────────────────────────┐
│ Template-basiert (Medusa Notification Module):            │
│                                                          │
│ Auth:                                                    │
│  ✉ Willkommen (nach Freigabe)                           │
│  ✉ E-Mail Verifizierung                                │
│  ✉ Passwort Reset                                       │
│  ✉ Einladung zum Firmenkonto                            │
│                                                          │
│ Orders:                                                  │
│  ✉ Bestellbestätigung (Buyer)                           │
│  ✉ Bestellung genehmigt (Buyer)                         │
│  ✉ Genehmigung erforderlich (Admin)                     │
│  ✉ Bestellung abgelehnt (Buyer + Grund)                 │
│  ✉ Bestellung versendet (Buyer) + Tracking             │
│  ✉ Bestellung zugestellt (Buyer)                        │
│                                                          │
│ Rechnungen:                                              │
│  ✉ Rechnung erstellt (PDF Anhang)                       │
│  ✉ Zahlungserinnerung (-7 Tage)                         │
│  ✉ Zahlung überfällig (+7 Tage)                         │
│  ✉ Zahlungseingang bestätigt                           │
│                                                          │
│ Angebote:                                                │
│  ✉ Neue Angebotsanfrage (an Vertrieb)                   │
│  ✉ Angebot erstellt (an Buyer)                          │
│  ✉ Angebot akzeptiert (an Vertrieb)                     │
│  ✉ Angebot abgelaufen (30 Tage)                         │
│                                                          │
│ Versand via:                                             │
│  - Resend (empfohlen für transactional E-Mail)          │
│  - oder SMTP (Postfix auf Netcup)                       │
│  - Absender: noreply@fenstervertrieb.com                │
│  - Reply-To: info@fenstervertrieb.com                  │
│  - Alle E-Mails auf Deutsch                              │
└──────────────────────────────────────────────────────────┘
```

### 3.11 Admin Backend (Medusa Admin)

```
[Medusa Admin — Erweiterungen]
┌──────────────────────────────────────────────────────────┐
│ Standard Medusa Admin (bereits enthalten):               │
│  - Produkte, Varianten, Preise                           │
│  - Orders, Fulfillment                                    │
│  - Customers, Customer Groups                            │
│  - Promotions, Discounts                                  │
│  - Settings                                               │
│                                                           │
│ B2B-spezifische Custom Routes:                            │
│  - /app/companies — Firmenübersicht                       │
│  - /app/companies/:id — Firmendetails                    │
│    - Team-Mitglieder, Ausgaben, Orders                   │
│    - Kreditlimit, Zahlungsbedingungen                    │
│    - Freigabe-Status, USt-IdNr. Verifizierung            │
│  - /app/companies/pending — Neue Anmeldungen             │
│    - Freigeben / Ablehnen                                │
│  - /app/quotes — Angebotsanfragen                        │
│    - Angebot erstellen (Positionen, Preise)              │
│    - In PDF exportieren                                   │
│  - /app/approvals — Ausstehende Genehmigungen            │
│                                                           │
│ Automatisierungen:                                        │
│  - USt-IdNr. Prüfung bei EU-VAT API (automatisch)       │
│  - Credit-Limit Check bei Order-Erstellung               │
│  - E-Mail-Templates verwalten                             │
│  - Pricing Rules pro Customer Group                      │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Technische Umsetzung

### 4.1 Medusa Backend (Custom Module)

#### Company Module (Neu)
```
src/modules/company/
  models/company.ts        — Firmen-Datenmodell
  models/company_member.ts — Mitgliedschaft + Rolle
  models/company_invite.ts — Einladungen
  workflows/
    create-company.ts      — Firma + Owner erstellen
    invite-member.ts       — Einladung senden
    accept-invite.ts       — Einladung annehmen
    remove-member.ts       — Mitglied entfernen
    change-role.ts         — Rolle ändern
  api/
    admin/companies/       — Admin-Routes
    store/companies/        — Storefront-Routes
```

#### Company Datenmodell
```typescript
// company.ts
model Company {
  id: string (PK)
  name: string
  vat_id: string (USt-IdNr.)
  tax_number: string
  address: Address
  billing_address: Address (abweichend)
  industry: string
  credit_limit: number
  payment_terms: "net_30" | "net_60" | "prepaid"
  status: "pending" | "approved" | "suspended"
  customer_group_id: string (FK → CustomerGroup)
  created_at: Date
  updated_at: Date

  // Relations
  members: CompanyMember[]
  invites: CompanyInvite[]
  delivery_addresses: CompanyAddress[]
  orders: Order[]
  quotes: Quote[]
}

// company_member.ts
model CompanyMember {
  id: string (PK)
  company_id: string (FK)
  customer_id: string (FK → Customer)
  role: "owner" | "admin" | "buyer" | "viewer"
  spending_limit: number (pro Order)
  monthly_budget: number
  approval_threshold: number (ab X€ → Genehmigung)
  status: "active" | "inactive"
  created_at: Date
}

// company_invite.ts
model CompanyInvite {
  id: string (PK)
  company_id: string (FK)
  email: string
  role: "admin" | "buyer" | "viewer"
  token: string (unique, 7 Tage gültig)
  status: "pending" | "accepted" | "expired" | "revoked"
  expires_at: Date
  created_at: Date
}
```

#### Quote Module (Neu)
```
src/modules/quote/
  models/quote.ts
  models/quote-item.ts
  workflows/
    create-quote.ts
    submit-quote.ts
    accept-quote.ts
    reject-quote.ts
    quote-to-order.ts
  api/
    admin/quotes/
    store/quotes/
```

### 4.2 Next.js B2B Storefront

```
apps/b2b-storefront/  (Next.js 15)
  src/
    app/
      (auth)/
        login/
        register/
        verify-email/
        forgot-password/
        reset-password/
        invite/[token]/
      (dashboard)/
        dashboard/          — Übersicht
        products/           — Katalog
        products/[slug]/    — Produktdetail
        configurator/       — Konfigurator (migriert)
        cart/               — Warenkorb
        checkout/           — Checkout
        orders/             — Meine Bestellungen
        orders/[id]/        — Bestelldetails
        quotes/             — Angebote
        quotes/[id]/        — Angebotsdetails
        invoices/           — Rechnungen
        team/               — Team verwalten (Admin/Owner)
        company/            — Firmenprofil (Admin/Owner)
        addresses/          — Lieferadressen
        approvals/          — Genehmigungen (Admin)
        settings/           — Persönliche Einstellungen
    middleware.ts           — Auth Guard + Rollen-Check
    lib/
      medusa.ts            — Medusa Client
      auth.ts              — Auth Utilities
      company.ts           — Company Context Provider
```

### 4.3 Infrastruktur

```
docker-compose.yml (erweitert):
  postgres     — bestehend (Port 5433)
  redis        — bestehend (Port 6380)
  medusa       — Backend (Port 9002)
  medusa-admin — Admin Dashboard (Port 9002/admin)
  storefront   — Next.js B2B (Port 3100, NEW)
  marketing    — Astro Static (Port 3099, bestehend)

Caddy/Traefik Routes:
  fenstervertrieb.de         → marketing (Astro)
  app.fenstervertrieb.de     → storefront (Next.js)
  admin.fenstervertrieb.de   → medusa-admin (oder /admin Pfad)
```

---

## 5. Implementierungs-Phasen

### Phase 1: Backend Foundation (Woche 1-2)
- [ ] Medusa v2 Backend zum Laufen bringen (DB migration, seed)
- [ ] Admin-User erstellen, Admin Dashboard erreichbar
- [ ] Produktkatalog in Medusa anlegen (aus bestehendem Content)
- [ ] B2B Customer Group + Pricing Rules
- [ ] E-Mail Service konfigurieren (Resend)

### Phase 2: Company Module (Woche 3-4)
- [ ] Company Datenmodell + Migration
- [ ] CompanyMember + CompanyInvite Modelle
- [ ] Create-Company Workflow
- [ ] Invite-Member Workflow
- [ ] Accept-Invite Workflow
- [ ] Rollen-System + Berechtigungs-Check
- [ ] Admin API Routes für Firmenverwaltung
- [ ] Store API Routes für Self-Service

### Phase 3: Next.js Storefront Basis (Woche 4-5)
- [ ] Next.js Projekt aufsetzen (Medusa Starter)
- [ ] Auth: Login, Register, Verify, Reset
- [ ] Medusa Client Integration
- [ ] Product Listing + Detail Pages
- [ ] Cart + Checkout (B2B: Rechnung/Vorkasse)
- [ ] Order History
- [ ] Middleware: Auth Guard + Rollen-Check

### Phase 4: B2B Portal Features (Woche 6-8)
- [ ] Company Dashboard
- [ ] Team-Management (Einladen, Rollen, Deaktivieren)
- [ ] Ausgabengrenzen + Genehmigungsflow
- [ ] Quote/Angebots-System
- [ ] Invoice + Payment Tracking
- [ ] Reorder-Funktion
- [ ] Konfigurator-Migration (Astro → Next.js, mit Preisberechnung)

### Phase 5: E-Mail & Automation (Woche 7-8)
- [ ] Resend Integration
- [ ] Alle 15+ E-Mail Templates
- [ ] USt-IdNr. Validierung (EU VIES API)
- [ ] Kreditlimit-Check Automatisierung
- [ ] Zahlungserinnerungen
- [ ] Order-Status-Benachrichtigungen

### Phase 6: Polish & Go-Live (Woche 9-10)
- [ ] Cross-Link Marketing ↔ Portal
- [ ] SEO für B2B-Produktseiten
- [ ] Mobile-optimierung Dashboard
- [ ] Performance-Testing
- [ ] Security Review (Auth, Rate-Limiting, CSRF)
- [ ] Staging-Deploy → Final QA
- [ ] DNS: app.fenstervertrieb.de
- [ ] Go-Live

---

## 6. Edge Case Checklist — lückenlos

| # | Scenario | Behandlung |
|---|----------|------------|
| 1 | Registrierung mit ungültiger USt-IdNr. | Fehler + Hinweis EU VIES |
| 2 | Registrierung mit free E-Mail (gmail etc.) | Fehler + "Firmen-E-Mail erforderlich" |
| 3 | Doppelte Firmen-Registrierung | Admin muss manuell prüfen |
| 4 | Account nicht freigegeben | Banner + Hinweis, kein Zugang |
| 5 | 3 falsche Login-Versuche | 15min Lockout + E-Mail |
| 6 | Passwort vergessen | Reset-Link 24h gültig |
| 7 | E-Mail nicht verifiziert | "Bitte verifizieren" + Re-send |
| 8 | Einladung abgelaufen | Fehler + "Kontaktieren Sie Ihren Admin" |
| 9 | Eingeladener hat bereits Account | Direkt zur Firma hinzufügen |
| 10 | Eingeladener bei anderer Firma | Admin muss manuell klären |
| 11 | Letzter Admin deaktiviert sich | System verhindert (min 1 Admin) |
| 12 | Owner verlässt Firma | Owner-Wechsel erforderlich |
| 13 | Buyer über Ausgabengrenze | Genehmigungs-Antrag an Admin |
| 14 | Kreditlimit überschritten | Bestellung blockiert + Hinweis |
| 15 | Rechnung überfällig | Erinnerung -7, 0, +7 Tage |
| 16 | Angebot abgelaufen (30 Tage) | Auto-Status + E-Mail |
| 17 | Angebot abgelehnt | Buyer bekommt E-Mail + Grund |
| 18 | Bestellung storniert (vor Versand) | OK, automatische Gutschrift |
| 19 | Bestellung storniert (nach Versand) | Retoure-Prozess |
| 20 | Retoure / Reklamation | Formular + Admin-Bearbeitung |
| 21 | Team-Mitglied deaktiviert | Kein Login mehr, Orders bleiben |
| 22 | Session Timeout (8h) | Automatischer Logout |
| 23 | GleichzeitigeSessions (>3) | Älteste Session invalidated |
| 24 | Simultane Genehmigung (Race) | Optimistic Locking / Version Check |
| 25 | Konfigurator → Nullpreis (Sondermaß) | "Auf Anfrage" statt "In den Warenkorb" |
| 26 | Produkt nicht lieferbar | "Aktuell nicht verfügbar" + Benachrichtigung |
| 27 | Versandkosten (Großformat) | Custom Shipping Calculator |
| 28 | MwSt.-Satz verschiedene Länder | DE 19%, ES 21%, IT 22%, etc. |
| 29 | Firmenauflösung | Admin sperrt Account, offene Rechnungen klären |
| 30 | Datenschutz-Lösch-Antrag | DSGVO-Workflow: Daten anonymisieren |

---

## 7. Tech Stack Summary

| Layer | Technologie |
|-------|-------------|
| Marketing-Site | Astro 6 + Tailwind v4 (bestehend) |
| B2B Portal | Next.js 15 + Medusa UI |
| Backend | Medusa v2 (^2.4.0) |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| E-Mail | Resend |
| Payment | Stripe (B2B Invoice + Card) |
| Hosting | Netcup VPS (Docker) |
| DNS | fenstervertrieb.de + app.fenstervertrieb.de |
| CI/CD | GitHub Push → Event Gateway → Deploy |

---

## 8. Offene Fragen an MG

1. **USt-IdNr. Pflicht?** Sollen wir auch B2C-Kunden (ohne USt-IdNr.) zulassen oder B2B-only?
2. **Zahlungsbedingungen:** Standard Net 30? Oder nach Kunde unterschiedlich?
3. **Kreditlimit:** Gibt es ein Standard-Limit für neue Firmen (z.B. 10.000€)?
4. **Genehmigungsflow:** Ab welchem Bestellwert soll der Admin der Firma die Bestellung genehmigen müssen?
5. **Angebote:** Sollen Kunden auch ohne Login Angebote anfragen können (wie aktuell der Konfigurator)?
6. **Sprachen:** Nur Deutsch, oder auch Spanisch/Italienisch für die Zielmärkte?
7. **Domain:** app.fenstervertrieb.de als Subdomain für das Portal? Oder shop.fenstervertrieb.de?
8. **SEO:** Sollen B2B-Produktseiten public indexiert werden (mit "Auf Anfrage" statt Preisen)?