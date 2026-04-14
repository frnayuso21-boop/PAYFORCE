import {
  Document, Page, Text, View, StyleSheet, Image as PDFImage,
} from "@react-pdf/renderer";

export interface InvoiceData {
  invoiceNumber:    string;
  invoiceDate:      string;
  dueDate?:         string;
  status:           string;
  /* merchant — desde InvoiceSettings o ConnectedAccount */
  merchantName:     string;
  merchantEmail:    string;
  merchantCountry:  string;
  merchantTaxId?:   string;
  merchantAddress?: string;
  merchantCity?:    string;
  merchantPostal?:  string;
  merchantPhone?:   string;
  merchantWebsite?: string;
  merchantLogoUrl?: string | null;
  accentColor?:     string;
  invoiceNotes?:    string;
  paymentTerms?:    string;
  bankAccount?:     string;
  /* customer */
  customerName?:    string;
  customerEmail?:   string;
  /* payment */
  paymentId:        string;
  stripeId:         string;
  description?:     string;
  amount:           number;
  currency:         string;
  applicationFee:   number;
  netAmount:        number;
  createdAt:        string;
}

function fmt(cents: number, currency = "eur") {
  return new Intl.NumberFormat("es-ES", {
    style:    "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function fmtDate(d: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(new Date(d));
}

export function InvoiceDocument({ d }: { d: InvoiceData }) {
  const accent   = d.accentColor ?? "#6366f1";
  const succeeded = d.status === "SUCCEEDED";
  const net      = d.amount - d.applicationFee;

  const s = StyleSheet.create({
    page:       { backgroundColor: "#fff", paddingHorizontal: 48, paddingVertical: 44, fontSize: 9, color: "#0f172a", fontFamily: "Helvetica" },
    /* header */
    header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 },
    logoBox:    { flexDirection: "column", gap: 3 },
    pill:       { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start" },
    pillText:   { color: "#fff", fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
    logoImg:    { height: 36, objectFit: "contain" },
    brandSub:   { fontSize: 8, color: "#64748b", marginTop: 4, lineHeight: 1.5 },
    invoiceCol: { alignItems: "flex-end" },
    invoiceH1:  { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#0f172a" },
    invoiceNum: { fontSize: 8.5, color: "#64748b", marginTop: 3 },
    /* divider */
    divider:    { borderBottomWidth: 1, borderColor: "#e2e8f0", marginVertical: 14 },
    /* meta */
    metaRow:    { flexDirection: "row", marginBottom: 22 },
    metaCol:    { flex: 1, flexDirection: "column", gap: 3.5 },
    metaLabel:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 },
    metaVal:    { fontSize: 9, color: "#0f172a", lineHeight: 1.5 },
    metaBold:   { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#0f172a" },
    /* badge */
    badge:      { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 },
    badgeOk:    { backgroundColor: "#dcfce7" },
    badgeFail:  { backgroundColor: "#fee2e2" },
    badgeText:  { fontSize: 8, fontFamily: "Helvetica-Bold" },
    badgeOkTxt: { color: "#16a34a" },
    badgeFailTxt:{ color: "#dc2626" },
    /* table */
    tHead:      { flexDirection: "row", borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 3 },
    tRow:       { flexDirection: "row", paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1, borderColor: "#e2e8f0" },
    tRowLast:   { borderColor: "transparent" },
    cDesc:      { flex: 3, fontSize: 8.5, color: "#0f172a" },
    cQty:       { flex: 1, fontSize: 8.5, color: "#64748b", textAlign: "center" },
    cUnit:      { flex: 1.5, fontSize: 8.5, textAlign: "right" },
    cTot:       { flex: 1.5, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },
    cHdr:       { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.6 },
    /* totals */
    totBox:     { marginTop: 10, marginLeft: "auto", width: 220, flexDirection: "column", gap: 5 },
    totRow:     { flexDirection: "row", justifyContent: "space-between" },
    totLabel:   { fontSize: 8.5, color: "#64748b" },
    totValue:   { fontSize: 8.5, color: "#0f172a" },
    grandRow:   { flexDirection: "row", justifyContent: "space-between", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
    grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#fff" },
    grandValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#fff" },
    /* notes */
    notesBox:   { marginTop: 24, borderRadius: 8, padding: 12 },
    notesLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
    notesText:  { fontSize: 8.5, color: "#475569", lineHeight: 1.5 },
    /* footer */
    footer:     { marginTop: "auto", paddingTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    footLeft:   { fontSize: 7.5, color: "#94a3b8", lineHeight: 1.6, flex: 1 },
    footRight:  { fontSize: 7.5, color: "#94a3b8", textAlign: "right" },
    secRow:     { flexDirection: "row", gap: 8, marginTop: 4 },
    secPill:    { backgroundColor: "#f8fafc", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
    secText:    { fontSize: 7, color: "#94a3b8" },
  });

  return (
    <Document title={`Factura ${d.invoiceNumber}`} author="PayForce" creator="PayForce Systems">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          {/* Logo / nombre merchant */}
          <View style={s.logoBox}>
            {d.merchantLogoUrl ? (
              <PDFImage src={d.merchantLogoUrl} style={s.logoImg} />
            ) : (
              <View style={[s.pill, { backgroundColor: accent }]}>
                <Text style={s.pillText}>{d.merchantName.slice(0, 14)}</Text>
              </View>
            )}
            <Text style={s.brandSub}>{d.merchantEmail}</Text>
            {d.merchantPhone   && <Text style={s.brandSub}>Tel: {d.merchantPhone}</Text>}
            {d.merchantWebsite && <Text style={s.brandSub}>{d.merchantWebsite}</Text>}
          </View>
          {/* Número de factura */}
          <View style={s.invoiceCol}>
            <Text style={s.invoiceH1}>FACTURA</Text>
            <Text style={s.invoiceNum}>Nº {d.invoiceNumber}</Text>
            <Text style={s.invoiceNum}>Fecha: {fmtDate(d.invoiceDate)}</Text>
            {d.dueDate && <Text style={s.invoiceNum}>Vto: {fmtDate(d.dueDate)}</Text>}
            <Text style={[s.invoiceNum, { marginTop: 4 }]}>Condiciones: {d.paymentTerms ?? "Pago inmediato"}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Emisor / Receptor / Estado ── */}
        <View style={s.metaRow}>
          {/* Emisor */}
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Emitida por</Text>
            <Text style={s.metaBold}>{d.merchantName}</Text>
            {d.merchantTaxId  && <Text style={s.metaVal}>{d.merchantTaxId}</Text>}
            {d.merchantAddress && <Text style={s.metaVal}>{d.merchantAddress}</Text>}
            {(d.merchantPostal || d.merchantCity) && (
              <Text style={s.metaVal}>{[d.merchantPostal, d.merchantCity].filter(Boolean).join(" ")}</Text>
            )}
            <Text style={s.metaVal}>País: {d.merchantCountry}</Text>
          </View>

          {/* Receptor */}
          <View style={s.metaCol}>
            <Text style={s.metaLabel}>Facturado a</Text>
            <Text style={s.metaBold}>{d.customerName ?? "Cliente"}</Text>
            {d.customerEmail && <Text style={s.metaVal}>{d.customerEmail}</Text>}
          </View>

          {/* Estado */}
          <View style={[s.metaCol, { alignItems: "flex-end" }]}>
            <Text style={s.metaLabel}>Estado</Text>
            <View style={[s.badge, succeeded ? s.badgeOk : s.badgeFail]}>
              <Text style={[s.badgeText, succeeded ? s.badgeOkTxt : s.badgeFailTxt]}>
                {succeeded ? "✓  Pagado" : "✗  " + d.status}
              </Text>
            </View>
            <Text style={[s.metaVal, { marginTop: 6, textAlign: "right", color: "#94a3b8", fontSize: 7.5 }]}>
              Ref: {d.stripeId.slice(0, 22)}
            </Text>
          </View>
        </View>

        {/* ── Tabla de conceptos ── */}
        <View style={[s.tHead, { backgroundColor: "#f8fafc" }]}>
          <Text style={[s.cDesc, s.cHdr]}>Concepto</Text>
          <Text style={[s.cQty,  s.cHdr]}>Cant.</Text>
          <Text style={[s.cUnit, s.cHdr]}>Precio unit.</Text>
          <Text style={[s.cTot,  s.cHdr]}>Total</Text>
        </View>

        <View style={s.tRow}>
          <Text style={s.cDesc}>{d.description ?? "Pago procesado a través de PayForce"}</Text>
          <Text style={s.cQty}>1</Text>
          <Text style={[s.cUnit, { color: "#0f172a" }]}>{fmt(d.amount, d.currency)}</Text>
          <Text style={s.cTot}>{fmt(d.amount, d.currency)}</Text>
        </View>

        <View style={[s.tRow, s.tRowLast]}>
          <Text style={[s.cDesc, { color: "#94a3b8", fontSize: 8 }]}>Comisión de servicio PayForce (4% + 0,40 €)</Text>
          <Text style={[s.cQty,  { color: "#94a3b8", fontSize: 8 }]}>1</Text>
          <Text style={[s.cUnit, { color: "#94a3b8", fontSize: 8 }]}>−{fmt(d.applicationFee, d.currency)}</Text>
          <Text style={[s.cTot,  { color: "#94a3b8", fontSize: 8 }]}>−{fmt(d.applicationFee, d.currency)}</Text>
        </View>

        {/* ── Totales ── */}
        <View style={s.totBox}>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Subtotal</Text>
            <Text style={s.totValue}>{fmt(d.amount, d.currency)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Comisión PayForce</Text>
            <Text style={s.totValue}>−{fmt(d.applicationFee, d.currency)}</Text>
          </View>
          <View style={s.totRow}>
            <Text style={s.totLabel}>Neto recibido</Text>
            <Text style={s.totValue}>{fmt(net, d.currency)}</Text>
          </View>
          <View style={[s.grandRow, { backgroundColor: accent }]}>
            <Text style={s.grandLabel}>Total facturado</Text>
            <Text style={s.grandValue}>{fmt(d.amount, d.currency)}</Text>
          </View>
        </View>

        {/* ── Notas / condiciones ── */}
        {(d.invoiceNotes || d.bankAccount) && (
          <View style={[s.notesBox, { backgroundColor: "#f8fafc" }]}>
            {d.invoiceNotes && (
              <>
                <Text style={s.notesLabel}>Notas</Text>
                <Text style={s.notesText}>{d.invoiceNotes}</Text>
              </>
            )}
            {d.bankAccount && (
              <>
                <Text style={[s.notesLabel, { marginTop: d.invoiceNotes ? 8 : 0 }]}>Datos bancarios</Text>
                <Text style={s.notesText}>{d.bankAccount}</Text>
              </>
            )}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footLeft}>
            <Text>Documento generado automáticamente por PayForce Systems S.L.</Text>
            <Text>payforce.io · soporte@payforce.io</Text>
            <View style={s.secRow}>
              <View style={s.secPill}><Text style={s.secText}>🔒 PCI DSS Level 1</Text></View>
              <View style={s.secPill}><Text style={s.secText}>✓ 3D Secure</Text></View>
              <View style={s.secPill}><Text style={s.secText}>SSL 256-bit</Text></View>
            </View>
          </View>
          <View style={s.footRight}>
            <Text>Pago: {fmtDate(d.createdAt)}</Text>
            <Text style={{ marginTop: 2 }}>ID: {d.paymentId.slice(0, 16)}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
