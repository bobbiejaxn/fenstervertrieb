import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "FB Fenstervertrieb — B2B Portal",
  description: "Schüco Fenster & Türen — B2B Bestellportal für Gewerbekunden",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}