/**
 * Parser de Excel (.xlsx) y CSV para importación masiva de clientes de suscripción.
 * Devuelve el mismo formato que el parser XML SEPA para reutilizar el flujo de importación.
 */
import * as XLSX from "xlsx";

export interface ParsedRow {
  name:      string;
  email:     string | null;
  phone:     string | null;
  reference: string;       // MandatoId o auto-generado
  amount:    number;       // céntimos
  iban:      string | null;
  concept:   string | null;
}

/** Normaliza variantes de nombres de columna */
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (col) => col.toLowerCase().trim() === k.toLowerCase()
    );
    if (found !== undefined && row[found] !== undefined && row[found] !== null && row[found] !== "") {
      return String(row[found]).trim();
    }
  }
  return "";
}

function parseAmount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[€$£\s]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function makeRef(name: string, idx: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `IMP-${slug || "row"}-${idx + 1}`;
}

export function parseExcelBuffer(buffer: Buffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw:    false, // convertir todo a string para normalizar números con coma decimal
  });

  return rows
    .map((row, idx): ParsedRow => {
      const name  = pick(row, "nombre", "name", "cliente", "customer", "debtor", "deudor");
      const email = pick(row, "email", "correo", "mail", "e-mail") || null;
      const phone = pick(row, "teléfono", "telefono", "phone", "tel", "móvil", "movil") || null;
      const amtRaw = pick(row, "importe", "amount", "cantidad", "total", "cuota", "precio");
      const refRaw = pick(row, "mandatoid", "mndtid", "referencia", "reference", "ref", "id", "externalref");
      const iban   = pick(row, "iban") || null;
      const concept = pick(row, "concepto", "concept", "descripcion", "description", "detalle") || null;

      const amount    = parseAmount(amtRaw);
      const reference = refRaw || makeRef(name, idx);

      return { name, email, phone, reference, amount, iban, concept };
    })
    .filter((r) => r.name.length > 0 && r.amount > 0);
}

/** Genera un buffer Excel con la plantilla de importación */
export function generateTemplate(): Buffer {
  const data = [
    { Nombre: "Juan García",    Email: "juan@email.com",  "Teléfono": "+34612345678", Importe: "49.99",  Concepto: "Cuota mensual", MandatoId: "" },
    { Nombre: "María López",    Email: "maria@email.com", "Teléfono": "+34698765432", Importe: "19.90",  Concepto: "Cuota mensual", MandatoId: "" },
    { Nombre: "Carlos Martínez",Email: "",                "Teléfono": "",             Importe: "120.00", Concepto: "Cuota anual",   MandatoId: "MNDT-001" },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  // Ajustar anchos de columna
  ws["!cols"] = [
    { wch: 20 }, // Nombre
    { wch: 24 }, // Email
    { wch: 16 }, // Teléfono
    { wch: 10 }, // Importe
    { wch: 18 }, // Concepto
    { wch: 14 }, // MandatoId
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as ArrayBuffer);
}
