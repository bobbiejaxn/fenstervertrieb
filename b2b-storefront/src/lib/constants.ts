// B2B Portal – German locale constants
export const APP_NAME = "FB Fenstervertrieb"
export const APP_TAGLINE = "Ihr Partner für Schüco Fenster & Türen"

// Roles
export const ROLES = {
  owner: "Inhaber",
  admin: "Administrator",
  buyer: "Einkäufer",
  viewer: "Betrachter",
} as const

export const ROLE_DESCRIPTIONS = {
  owner: "Vollzugriff auf alle Funktionen inkl. Firmenprofil und Eigentumsübertragung",
  admin: "Team verwalten, Ausgabengrenzen setzen, alle Bestellungen genehmigen",
  buyer: "Produkte durchsuchen, in den Warenkorb legen, Angebote erstellen",
  viewer: "Produkte ansehen, Bestellungen einsehen (nur Lesezugriff)",
} as const

// Order statuses
export const ORDER_STATUS = {
  pending: "Ausstehend",
  approved: "Genehmigt",
  processing: "In Bearbeitung",
  shipped: "Versendet",
  delivered: "Zugestellt",
  cancelled: "Storniert",
  returned: "Retoure",
} as const

// Payment terms
export const PAYMENT_TERMS = {
  net_30: "Zahlung innerhalb 30 Tage",
  net_60: "Zahlung innerhalb 60 Tage",
  prepaid: "Vorkasse",
} as const

// Company statuses
export const COMPANY_STATUS = {
  pending: "Wartet auf Freigabe",
  approved: "Freigegeben",
  suspended: "Gesperrt",
} as const

// Invite statuses
export const INVITE_STATUS = {
  pending: "Ausstehend",
  accepted: "Angenommen",
  expired: "Abgelaufen",
  revoked: "Widerrufen",
} as const

// Validation
export const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.de", "yahoo.com", "hotmail.de", "hotmail.com",
  "outlook.de", "outlook.com", "web.de", "gmx.de", "gmx.net",
  "freenet.de", "t-online.de", "mail.de", "aol.de", "aol.com",
  "icloud.com", "me.com", "mac.com", "protonmail.com", "protonmail.de",
]

export const DEFAULT_CREDIT_LIMIT = 10000
export const DEFAULT_SPENDING_LIMIT = 2500
export const DEFAULT_APPROVAL_THRESHOLD = 2500