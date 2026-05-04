import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const required = ["name", "email"];
  for (const field of required) {
    if (!body[field]) {
      return new Response(
        JSON.stringify({ error: `${field} ist erforderlich` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Log the request (in production this would send an email or push to a CRM)
  console.log("=== Neue Konfigurator-Anfrage ===");
  console.log(JSON.stringify(body, null, 2));

  // Mailto fallback — construct a mailto link so the client can open it
  const lines = [
    "Neue Konfigurator-Anfrage",
    "",
    `Kategorie: ${body.category || ""}`,
    `System: ${body.system || ""}`,
    `Flügel: ${body.fluegel || ""}`,
    `Breite: ${body.width || "—"} mm`,
    `Höhe: ${body.height || "—"} mm`,
    `Farbe: ${body.farbe || ""}`,
    `Öffnungsart: ${body.oeffnung || ""}`,
    body.preis ? `Preisvorstellung: ${body.preis}` : "",
    "",
    "Kontaktdaten:",
    `Name: ${body.name}`,
    `E-Mail: ${body.email}`,
    body.telefon ? `Telefon: ${body.telefon}` : "",
    body.nachricht ? `Nachricht: ${body.nachricht}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const subject = encodeURIComponent(
    `Konfigurator-Anfrage: ${body.system || "Unbekannt"}`
  );
  const mailBody = encodeURIComponent(lines);
  const mailto = `mailto:info@fenstervertrieb.com?subject=${subject}&body=${mailBody}`;

  return new Response(
    JSON.stringify({ success: true, mailto }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};