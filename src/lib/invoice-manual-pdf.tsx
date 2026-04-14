import { Document, Page, Text, View, StyleSheet, Image as PDFImage } from "@react-pdf/renderer";

interface Line { description: string; quantity: number; unitPrice: number; taxRate: number; total: number; }
interface Invoice {
  invoiceNumber: string; status: string;
  clientName: string; clientEmail?: string | null; clientAddress?: string | null; clientTaxId?: string | null;
  issueDate: Date | string; dueDate?: Date | string | null;
  subtotal: number; discount: number; taxAmount: number; total: number; currency: string;
  notes?: string | null; paymentTerms: string; bankAccount?: string | null;
  lines: Line[];
}
interface Settings {
  companyName?: string; taxId?: string; address?: string; city?: string; postalCode?: string;
  country?: string; phone?: string; website?: string; email?: string;
  logoUrl?: string | null; accentColor?: string; invoiceNotes?: string; bankAccount?: string;
}

const fmt = (c: number, cur = "eur") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: cur.toUpperCase() }).format(c / 100);
const fmtD = (d: Date | string) =>
  new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d));

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "Borrador", SENT: "Enviada", PAID: "Pagada",
  OVERDUE:   "Vencida",  CANCELLED: "Cancelada",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8", SENT: "#3b82f6", PAID: "#16a34a", OVERDUE: "#dc2626", CANCELLED: "#64748b",
};

export function ManualInvoiceDocument({ invoice, settings }: { invoice: Invoice; settings: Settings | null }) {
  const accent = settings?.accentColor ?? "#6366f1";
  const s = StyleSheet.create({
    page:    { backgroundColor: "#fff", paddingHorizontal: 48, paddingVertical: 44, fontSize: 9, color: "#0f172a", fontFamily: "Helvetica" },
    header:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
    logoBox: { flexDirection: "column", gap: 3 },
    pill:    { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start" },
    pillTxt: { color: "#fff", fontSize: 12, fontFamily: "Helvetica-Bold" },
    logoImg: { height: 36, objectFit: "contain" },
    sub:     { fontSize: 8, color: "#64748b", marginTop: 3, lineHeight: 1.5 },
    invCol:  { alignItems: "flex-end" },
    invH1:   { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#0f172a" },
    invNum:  { fontSize: 8.5, color: "#64748b", marginTop: 2 },
    div:     { borderBottomWidth: 1, borderColor: "#e2e8f0", marginVertical: 14 },
    metaRow: { flexDirection: "row", marginBottom: 22 },
    metaCol: { flex: 1, flexDirection: "column", gap: 3.5 },
    mLabel:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
    mVal:    { fontSize: 9, color: "#0f172a", lineHeight: 1.5 },
    mBold:   { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#0f172a" },
    badge:   { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" },
    bTxt:    { fontSize: 8, fontFamily: "Helvetica-Bold" },
    tHead:   { flexDirection: "row", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 3 },
    tRow:    { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: "#e2e8f0" },
    cDesc:   { flex: 3.5, fontSize: 8.5, color: "#0f172a" },
    cQty:    { flex: 0.8, fontSize: 8.5, textAlign: "right", color: "#64748b" },
    cPrice:  { flex: 1.5, fontSize: 8.5, textAlign: "right", color: "#0f172a" },
    cTax:    { flex: 1, fontSize: 8.5, textAlign: "right", color: "#64748b" },
    cTot:    { flex: 1.5, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
    cHdr:    { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
    totBox:  { marginTop: 12, marginLeft: "auto", width: 230, flexDirection: "column", gap: 5 },
    totRow:  { flexDirection: "row", justifyContent: "space-between" },
    totL:    { fontSize: 8.5, color: "#64748b" },
    totV:    { fontSize: 8.5, color: "#0f172a" },
    grand:   { flexDirection: "row", justifyContent: "space-between", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
    grandL:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#fff" },
    grandV:  { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#fff" },
    notes:   { marginTop: 20, borderRadius: 8, padding: 12, backgroundColor: "#f8fafc" },
    nLabel:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    nTxt:    { fontSize: 8.5, color: "#475569", lineHeight: 1.5 },
    footer:  { marginTop: "auto", paddingTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between" },
    footL:   { fontSize: 7.5, color: "#94a3b8", lineHeight: 1.6, flex: 1 },
    footR:   { fontSize: 7.5, color: "#94a3b8", textAlign: "right" },
  });

  const statusColor = STATUS_COLORS[invoice.status] ?? "#94a3b8";

  return (
    <Document title={`Factura ${invoice.invoiceNumber}`} author="PayForce" creator="PayForce Systems">
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <View style={s.logoBox}>
            {settings?.logoUrl
              ? <PDFImage src={settings.logoUrl} style={s.logoImg} />
              : <View style={[s.pill, { backgroundColor: accent }]}><Text style={s.pillTxt}>{(settings?.companyName || "Empresa").slice(0,14)}</Text></View>
            }
            {settings?.email   && <Text style={s.sub}>{settings.email}</Text>}
            {settings?.phone   && <Text style={s.sub}>Tel: {settings.phone}</Text>}
            {settings?.website && <Text style={s.sub}>{settings.website}</Text>}
          </View>
          <View style={s.invCol}>
            <Text style={s.invH1}>FACTURA</Text>
            <Text style={s.invNum}>Nº {invoice.invoiceNumber}</Text>
            <Text style={s.invNum}>Fecha: {fmtD(invoice.issueDate)}</Text>
            {invoice.dueDate && <Text style={s.invNum}>Vto: {fmtD(invoice.dueDate)}</Text>}
            <Text style={[s.invNum, { marginTop: 4 }]}>{invoice.paymentTerms}</Text>
          </View>
        </View>

        <View style={s.div} />

        <View style={s.metaRow}>
          <View style={s.metaCol}>
            <Text style={s.mLabel}>Emitida por</Text>
            <Text style={s.mBold}>{settings?.companyName ?? "Tu empresa"}</Text>
            {settings?.taxId     && <Text style={s.mVal}>{settings.taxId}</Text>}
            {settings?.address   && <Text style={s.mVal}>{settings.address}</Text>}
            {(settings?.postalCode||settings?.city) && <Text style={s.mVal}>{[settings.postalCode,settings.city].filter(Boolean).join(" ")}</Text>}
            <Text style={s.mVal}>País: {settings?.country ?? "ES"}</Text>
          </View>
          <View style={s.metaCol}>
            <Text style={s.mLabel}>Facturado a</Text>
            <Text style={s.mBold}>{invoice.clientName}</Text>
            {invoice.clientTaxId   && <Text style={s.mVal}>{invoice.clientTaxId}</Text>}
            {invoice.clientAddress && <Text style={s.mVal}>{invoice.clientAddress}</Text>}
            {invoice.clientEmail   && <Text style={s.mVal}>{invoice.clientEmail}</Text>}
          </View>
          <View style={[s.metaCol, { alignItems: "flex-end" }]}>
            <Text style={s.mLabel}>Estado</Text>
            <View style={[s.badge, { backgroundColor: statusColor + "22" }]}>
              <Text style={[s.bTxt, { color: statusColor }]}>{STATUS_LABELS[invoice.status] ?? invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* Tabla de líneas */}
        <View style={[s.tHead, { backgroundColor: "#f8fafc" }]}>
          {["Concepto","Cant.","P. Unit.","IVA %","Total"].map((h,i) => (
            <Text key={h} style={[i===0?s.cDesc:i===1?s.cQty:i===2?s.cPrice:i===3?s.cTax:s.cTot, s.cHdr]}>{h}</Text>
          ))}
        </View>
        {invoice.lines.map((l, i) => (
          <View key={i} style={s.tRow}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cPrice}>{fmt(l.unitPrice, invoice.currency)}</Text>
            <Text style={s.cTax}>{l.taxRate > 0 ? `${l.taxRate}%` : "—"}</Text>
            <Text style={s.cTot}>{fmt(l.total, invoice.currency)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={s.totBox}>
          <View style={s.totRow}><Text style={s.totL}>Subtotal</Text><Text style={s.totV}>{fmt(invoice.subtotal, invoice.currency)}</Text></View>
          {invoice.discount > 0 && (
            <View style={s.totRow}><Text style={s.totL}>Descuento</Text><Text style={s.totV}>−{fmt(invoice.discount, invoice.currency)}</Text></View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={s.totRow}><Text style={s.totL}>IVA</Text><Text style={s.totV}>{fmt(invoice.taxAmount, invoice.currency)}</Text></View>
          )}
          <View style={[s.grand, { backgroundColor: accent }]}>
            <Text style={s.grandL}>TOTAL</Text>
            <Text style={s.grandV}>{fmt(invoice.total, invoice.currency)}</Text>
          </View>
        </View>

        {/* Notas / IBAN */}
        {(invoice.notes || invoice.bankAccount || settings?.invoiceNotes) && (
          <View style={s.notes}>
            {(invoice.notes || settings?.invoiceNotes) && (
              <><Text style={s.nLabel}>Notas</Text>
              <Text style={s.nTxt}>{invoice.notes ?? settings?.invoiceNotes}</Text></>
            )}
            {(invoice.bankAccount || settings?.bankAccount) && (
              <><Text style={[s.nLabel, { marginTop: 8 }]}>Datos bancarios</Text>
              <Text style={s.nTxt}>{invoice.bankAccount ?? settings?.bankAccount}</Text></>
            )}
          </View>
        )}

        <View style={s.footer}>
          <View style={s.footL}>
            <Text>Generado por PayForce Systems S.L. · payforce.io</Text>
          </View>
          <View style={s.footR}>
            <Text>{fmtD(invoice.issueDate)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
