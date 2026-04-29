import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

export interface ReceiptData {
  reference:     string;
  date:          string;
  time:          string;
  merchantName:  string;
  accentColor:   string;
  customerName?: string | null;
  customerEmail?: string | null;
  description?:  string | null;
  amount:        number;
  currency:      string;
  paymentMethod: string;
  paymentId:     string;
}

function fmt(cents: number, currency = "eur") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function ReceiptDocument({ d }: { d: ReceiptData }) {
  const accent = d.accentColor || "#0A0A0A";

  const styles = StyleSheet.create({
    page:       { fontFamily: "Helvetica", backgroundColor: "#fff", padding: 40 },
    header:     { backgroundColor: accent, borderRadius: 8, padding: "16 20", marginBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hTitle:     { color: "#fff", fontSize: 13, fontFamily: "Helvetica-Bold" },
    hSub:       { color: "rgba(255,255,255,0.55)", fontSize: 9, marginTop: 2 },
    badge:      { backgroundColor: "#F0FDF4", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    badgeTxt:   { fontSize: 9, color: "#10B981", fontFamily: "Helvetica-Bold" },
    amountBox:  { backgroundColor: accent, borderRadius: 8, padding: "14 20", marginBottom: 20, alignItems: "center" },
    amountVal:  { color: "#fff", fontSize: 28, fontFamily: "Helvetica-Bold" },
    amountLbl:  { color: "rgba(255,255,255,0.55)", fontSize: 8, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
    row:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" },
    rowLabel:   { fontSize: 10, color: "#6B7280" },
    rowValue:   { fontSize: 11, color: "#111827", fontFamily: "Helvetica-Bold" },
    divider:    { borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB", marginVertical: 14 },
    idLabel:    { fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
    idValue:    { fontSize: 8, color: "#9CA3AF", fontFamily: "Helvetica" },
    footer:     { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerTxt:  { fontSize: 8, color: "#D1D5DB", textTransform: "uppercase", letterSpacing: 1 },
  });

  const rows = [
    { label: "Referencia",     value: d.reference },
    { label: "Fecha",          value: d.date },
    { label: "Hora",           value: d.time },
    { label: "Concepto",       value: d.description || "—" },
    { label: "Método de pago", value: d.paymentMethod },
    ...(d.customerName  ? [{ label: "Nombre cliente", value: d.customerName  }] : []),
    ...(d.customerEmail ? [{ label: "Email cliente",  value: d.customerEmail }] : []),
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.hTitle}>{d.merchantName}</Text>
            <Text style={styles.hSub}>RECIBO DE PAGO</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>PAGADO</Text>
          </View>
        </View>

        {/* Importe */}
        <View style={styles.amountBox}>
          <Text style={styles.amountVal}>{fmt(d.amount, d.currency)}</Text>
          <Text style={styles.amountLbl}>Importe pagado</Text>
        </View>

        {/* Tabla de detalles */}
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.value}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* ID de pago */}
        <Text style={styles.idLabel}>ID de pago interno</Text>
        <Text style={styles.idValue}>{d.paymentId}</Text>

        {/* Footer fijo */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerTxt}>PayForce</Text>
          <Text style={styles.footerTxt}>PCI DSS · SSL 256-bit</Text>
        </View>
      </Page>
    </Document>
  );
}
