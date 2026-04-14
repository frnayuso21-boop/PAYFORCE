import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:       "Developers · PayForce API",
  description: "Documentación completa de la API de PayForce. Autenticación, endpoints, webhooks y SDKs.",
};

// ─── Code block ──────────────────────────────────────────────────────────────
function Code({ children, lang = "bash" }: { children: string; lang?: string }) {
  void lang;
  return (
    <pre className="overflow-x-auto rounded-xl p-4 text-[12px] leading-relaxed font-mono"
      style={{ background: "#0d1117", color: "#e6edf3", border: "1px solid #30363d" }}>
      <code>{children}</code>
    </pre>
  );
}

// ─── Endpoint badge ───────────────────────────────────────────────────────────
function Method({ m }: { m: "GET" | "POST" | "PUT" | "DELETE" }) {
  const colors = {
    GET:    "bg-emerald-900/50 text-emerald-400 border-emerald-700",
    POST:   "bg-blue-900/50   text-blue-400   border-blue-700",
    PUT:    "bg-amber-900/50  text-amber-400  border-amber-700",
    DELETE: "bg-red-900/50    text-red-400    border-red-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold border font-mono ${colors[m]}`}>{m}</span>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[22px] font-bold text-white mb-4 flex items-center gap-3">
        <span className="h-px flex-1 max-w-[24px]" style={{ background: "#6366f1" }} />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const NAV = [
  { id: "intro",        label: "Introducción" },
  { id: "auth",         label: "Autenticación" },
  { id: "payments",     label: "Payments" },
  { id: "customers",    label: "Customers" },
  { id: "invoices",     label: "Invoices" },
  { id: "webhooks",     label: "Webhooks" },
  { id: "migrate",      label: "Migración" },
  { id: "errors",       label: "Errores" },
  { id: "sdks",         label: "SDKs" },
];

export default function DevelopersPage() {
  return (
    <div className="min-h-screen" style={{ background: "#010409" }}>

      {/* ── Hero ── */}
      <div className="border-b" style={{ borderColor: "#21262d", background: "#010409" }}>
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold mb-6"
            style={{ borderColor: "#6366f1", color: "#a78bfa", background: "rgba(99,102,241,0.08)" }}>
            API v1 · 2025-01
          </div>
          <h1 className="text-[42px] font-black text-white leading-tight tracking-tight mb-4">
            PayForce API Reference
          </h1>
          <p className="text-[17px] text-slate-400 max-w-2xl">
            Integra pagos, clientes y facturas en cualquier stack.
            API REST con respuestas JSON, webhooks firmados y SDKs oficiales.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link href="/app/developers"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
              Obtener API key →
            </Link>
            <a href="https://github.com/payforce"
              className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13px] font-semibold text-slate-300 hover:text-white transition"
              style={{ borderColor: "#30363d" }}>
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="mx-auto max-w-7xl px-6 py-12 flex gap-12">

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Contenido</p>
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`}
              className="rounded-lg px-3 py-1.5 text-[12px] text-slate-400 hover:text-white hover:bg-white/5 transition">
              {n.label}
            </a>
          ))}

          <div className="mt-6 pt-5 border-t" style={{ borderColor: "#21262d" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Herramientas</p>
            <a href="https://www.npmjs.com/package/payforce-migrate"
              className="rounded-lg px-3 py-1.5 text-[12px] text-slate-400 hover:text-white hover:bg-white/5 transition block">
              npx payforce-migrate
            </a>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-16 min-w-0">

          {/* ── Introducción ── */}
          <Section id="intro" title="Introducción">
            <p className="text-slate-400 text-[14px] leading-relaxed">
              La API de PayForce sigue los estándares REST. Las solicitudes deben enviarse con
              <code className="mx-1 rounded px-1.5 py-0.5 text-[12px] font-mono" style={{ background: "#161b22", color: "#79c0ff" }}>Content-Type: application/json</code>.
              Todas las respuestas devuelven JSON con el header
              <code className="mx-1 rounded px-1.5 py-0.5 text-[12px] font-mono" style={{ background: "#161b22", color: "#79c0ff" }}>X-PayForce-Version: 2025-01</code>.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Base URL",     value: "https://payforce.io/api/v1" },
                { label: "Versión",      value: "2025-01" },
                { label: "Formato",      value: "JSON / REST" },
              ].map(i => (
                <div key={i.label} className="rounded-xl p-4" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{i.label}</p>
                  <p className="text-[13px] font-mono text-emerald-400">{i.value}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Auth ── */}
          <Section id="auth" title="Autenticación">
            <p className="text-slate-400 text-[14px] leading-relaxed">
              Todas las peticiones deben incluir tu API key en el header
              <code className="mx-1 rounded px-1.5 py-0.5 text-[12px] font-mono" style={{ background: "#161b22", color: "#79c0ff" }}>Authorization</code>
              como Bearer token. Puedes generar y gestionar tus API keys desde el
              <Link href="/app/developers" className="text-indigo-400 hover:text-indigo-300 mx-1">Dashboard → Desarrolladores</Link>.
            </p>
            <Code>{`curl https://payforce.io/api/v1/payments \\
  -H "Authorization: Bearer pf_live_a3b4c5d6e7f8..."`}</Code>

            <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[11px] font-bold text-amber-400 mb-2">⚠ Seguridad</p>
              <p className="text-[13px] text-slate-400">
                Las API keys con prefijo <code className="font-mono text-amber-300">pf_live_</code> tienen acceso completo a tu cuenta.
                Nunca las expongas en código frontend ni en repositorios públicos.
                Usa variables de entorno siempre.
              </p>
            </div>
          </Section>

          {/* ── Payments ── */}
          <Section id="payments" title="Payments">
            <div className="space-y-6">
              {/* List */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                  <Method m="GET" />
                  <code className="text-[13px] font-mono text-slate-200">/api/v1/payments</code>
                  <span className="ml-auto text-[11px] text-slate-500">Lista pagos</span>
                </div>
                <div className="p-5 space-y-3" style={{ background: "#010409" }}>
                  <p className="text-[13px] text-slate-400">Devuelve la lista de pagos paginada por cursor.</p>
                  <Code>{`curl https://payforce.io/api/v1/payments?limit=20 \\
  -H "Authorization: Bearer pf_live_..."

# Response
{
  "object":      "list",
  "data": [
    {
      "id":          "clx1234...",
      "stripe_id":   "pi_3Qx...",
      "amount":      4999,
      "currency":    "eur",
      "status":      "SUCCEEDED",
      "description": "Suscripción mensual",
      "created_at":  "2025-04-10T14:23:00Z"
    }
  ],
  "has_more":    false,
  "next_cursor": null
}`}</Code>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { param: "limit",  type: "integer", desc: "Resultados por página (default 20, max 100)" },
                      { param: "cursor", type: "string",  desc: "ID del último pago para paginación" },
                      { param: "status", type: "string",  desc: "SUCCEEDED | FAILED | PROCESSING | CANCELED" },
                    ].map(p => (
                      <div key={p.param} className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-[12px] font-mono text-indigo-300">{p.param}</code>
                          <span className="text-[10px] text-slate-500">{p.type}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Create */}
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
                <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                  <Method m="POST" />
                  <code className="text-[13px] font-mono text-slate-200">/api/v1/payments</code>
                  <span className="ml-auto text-[11px] text-slate-500">Crea un pago</span>
                </div>
                <div className="p-5" style={{ background: "#010409" }}>
                  <Code>{`curl -X POST https://payforce.io/api/v1/payments \\
  -H "Authorization: Bearer pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount":         4999,
    "currency":       "eur",
    "description":    "Suscripción Pro",
    "customer_email": "cliente@empresa.com"
  }'

# Response 201
{
  "id":            "clx1234...",
  "stripe_id":     "pi_3Qx...",
  "client_secret": "pi_3Qx..._secret_...",
  "amount":        4999,
  "currency":      "eur",
  "status":        "processing"
}`}</Code>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Customers ── */}
          <Section id="customers" title="Customers">
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                <Method m="POST" />
                <code className="text-[13px] font-mono text-slate-200">/api/v1/customers</code>
                <span className="ml-auto text-[11px] text-slate-500">Crea un cliente</span>
              </div>
              <div className="p-5" style={{ background: "#010409" }}>
                <Code>{`curl -X POST https://payforce.io/api/v1/customers \\
  -H "Authorization: Bearer pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name":     "Arista Móvil S.L.",
    "email":    "contacto@arista.com",
    "phone":    "+34600000000",
    "currency": "eur"
  }'`}</Code>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                <Method m="GET" />
                <code className="text-[13px] font-mono text-slate-200">/api/v1/customers?q=arista</code>
                <span className="ml-auto text-[11px] text-slate-500">Lista y busca clientes</span>
              </div>
              <div className="p-5" style={{ background: "#010409" }}>
                <Code>{`curl "https://payforce.io/api/v1/customers?q=arista&limit=10" \\
  -H "Authorization: Bearer pf_live_..."`}</Code>
              </div>
            </div>
          </Section>

          {/* ── Invoices ── */}
          <Section id="invoices" title="Invoices">
            <p className="text-slate-400 text-[14px]">Lista y gestiona las facturas manuales del merchant.</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                <Method m="GET" />
                <code className="text-[13px] font-mono text-slate-200">/api/v1/invoices</code>
              </div>
              <div className="p-5" style={{ background: "#010409" }}>
                <Code>{`curl https://payforce.io/api/v1/invoices?status=PAID \\
  -H "Authorization: Bearer pf_live_..."`}</Code>
              </div>
            </div>
          </Section>

          {/* ── Webhooks ── */}
          <Section id="webhooks" title="Webhooks">
            <p className="text-slate-400 text-[14px] leading-relaxed">
              PayForce envía eventos en tiempo real a tu endpoint cuando ocurren cambios importantes.
              Cada petición incluye el header <code className="mx-1 text-[12px] font-mono rounded px-1 py-0.5" style={{ background: "#161b22", color: "#79c0ff" }}>X-PayForce-Signature</code> firmado con HMAC-SHA256.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                "payment.succeeded",
                "payment.failed",
                "payment.refunded",
                "customer.created",
                "invoice.paid",
                "invoice.overdue",
              ].map(e => (
                <div key={e} className="flex items-center gap-2 rounded-lg px-4 py-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "#6366f1" }}/>
                  <code className="text-[12px] font-mono text-slate-300">{e}</code>
                </div>
              ))}
            </div>
            <Code>{`// Verificar la firma del webhook en tu servidor
import crypto from "crypto";

function verifyWebhook(payload: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// En tu handler:
app.post("/webhook", (req, res) => {
  const sig    = req.headers["x-payforce-signature"];
  const valid  = verifyWebhook(req.rawBody, sig, process.env.PF_WEBHOOK_SECRET);
  if (!valid) return res.status(401).send("Invalid signature");

  const event = req.body;
  switch (event.type) {
    case "payment.succeeded":
      fulfillOrder(event.data);
      break;
  }
  res.sendStatus(200);
});`}</Code>
          </Section>

          {/* ── Migration ── */}
          <Section id="migrate" title="Migración desde Stripe / Lemon Squeezy">
            <p className="text-slate-400 text-[14px] leading-relaxed">
              Importa toda tu base de clientes, productos y pagos históricos con un solo comando.
            </p>

            {/* CLI */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #6366f1", background: "#0d1117" }}>
              <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #21262d", background: "rgba(99,102,241,0.1)" }}>
                <span className="text-[12px] font-bold text-indigo-300">RECOMENDADO</span>
                <span className="text-[12px] text-slate-400">CLI interactivo</span>
              </div>
              <div className="p-5">
                <Code>{`# Sin instalación
npx payforce-migrate

# O instalar globalmente
npm install -g payforce-migrate
payforce-migrate`}</Code>
              </div>
            </div>

            {/* API */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #21262d" }}>
              <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                <Method m="POST" />
                <code className="text-[13px] font-mono text-slate-200">/api/migrate</code>
                <span className="ml-auto text-[11px] text-slate-500">API de migración</span>
              </div>
              <div className="p-5 space-y-4" style={{ background: "#010409" }}>
                <p className="text-[13px] text-slate-400">Desde Stripe:</p>
                <Code>{`curl -X POST https://payforce.io/api/migrate \\
  -H "Authorization: Bearer pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source":        "stripe",
    "stripe_secret": "sk_live_...",
    "dry_run":       true
  }'`}</Code>
                <p className="text-[13px] text-slate-400">Desde Lemon Squeezy:</p>
                <Code>{`curl -X POST https://payforce.io/api/migrate \\
  -H "Authorization: Bearer pf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source":     "lemon_squeezy",
    "ls_api_key": "eyJ0eXAiOi...",
    "dry_run":    false
  }'`}</Code>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { p: "source",        t: "string",  d: '"stripe" | "lemon_squeezy"' },
                    { p: "stripe_secret", t: "string",  d: "Stripe secret key (sk_live_ o sk_test_)" },
                    { p: "ls_api_key",    t: "string",  d: "LemonSqueezy API key" },
                    { p: "dry_run",       t: "boolean", d: "true = previsualiza sin escribir (default: false)" },
                  ].map(p => (
                    <div key={p.p} className="rounded-lg p-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-[12px] font-mono text-indigo-300">{p.p}</code>
                        <span className="text-[10px] text-slate-500">{p.t}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{p.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Errors ── */}
          <Section id="errors" title="Códigos de error">
            <p className="text-slate-400 text-[14px]">Todos los errores siguen el formato:</p>
            <Code>{`{
  "error": {
    "code":    "authentication_error",
    "message": "API key inválida o revocada.",
    "docs":    "https://payforce.io/developers"
  }
}`}</Code>
            <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #21262d" }}>
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: "#0d1117", borderBottom: "1px solid #21262d" }}>
                    {["HTTP", "Code", "Descripción"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["401", "authentication_error", "API key inválida, revocada o expirada."],
                    ["422", "invalid_param",         "Parámetro obligatorio faltante o inválido."],
                    ["422", "account_not_ready",     "La cuenta Stripe del merchant no está configurada."],
                    ["429", "rate_limit",             "Demasiadas solicitudes. Máximo 100 req/min."],
                    ["500", "internal_error",         "Error interno del servidor. Contacta soporte."],
                  ].map(([code, name, desc], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #161b22" }}>
                      <td className="px-5 py-3 font-mono text-amber-400">{code}</td>
                      <td className="px-5 py-3 font-mono text-blue-400">{name}</td>
                      <td className="px-5 py-3 text-slate-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── SDKs ── */}
          <Section id="sdks" title="SDKs">
            <div className="grid grid-cols-3 gap-4">
              {[
                { lang: "TypeScript / Node", pkg: "@payforce/sdk",      cmd: "npm install @payforce/sdk" },
                { lang: "Python",            pkg: "payforce-python",     cmd: "pip install payforce" },
                { lang: "PHP",               pkg: "payforce/payforce-php",cmd: "composer require payforce/payforce-php" },
              ].map(sdk => (
                <div key={sdk.lang} className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#0d1117", border: "1px solid #21262d" }}>
                  <p className="text-[13px] font-bold text-white">{sdk.lang}</p>
                  <code className="text-[11px] font-mono text-slate-400">{sdk.pkg}</code>
                  <div className="rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-400" style={{ background: "#010409" }}>{sdk.cmd}</div>
                </div>
              ))}
            </div>
            <Code>{`// TypeScript / Node.js
import PayForce from "@payforce/sdk";

const pf = new PayForce({ apiKey: process.env.PF_SECRET_KEY });

// Crear un pago
const payment = await pf.payments.create({
  amount:      4999,       // céntimos
  currency:    "eur",
  description: "Suscripción Pro",
});

console.log(payment.client_secret); // pasa esto al frontend`}</Code>
          </Section>

        </div>
      </div>
    </div>
  );
}
