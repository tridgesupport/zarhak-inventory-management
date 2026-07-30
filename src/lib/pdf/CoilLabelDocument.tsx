import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COMPANY } from "./theme";

export interface CoilLabelData {
  customer?: string | null;
  bundleNo: string;
  prodDate?: string | null;
  item?: string | null;
  thickness?: string | null;
  width?: string | null;
  cutLength?: string | null;
  coating?: string | null;
  temper?: string | null;
  finish?: string | null;
  tareWt?: string | null;
  grossWt?: string | null;
  netWt?: string | null;
  noOfSheets?: string | null;
  tcNo?: string | null;
  supplierCoilNo?: string | null;
  remarks?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 20, fontFamily: "Helvetica" },
  labelsRow: { flexDirection: "row", gap: 16 },
  label: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    padding: 10,
  },
  labelTitle: {
    fontSize: 10,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  labelText: { fontSize: 8, fontWeight: 700, width: 80 },
  valueText: { fontSize: 8, flex: 1 },
});

function LabelBox({ data }: { data: CoilLabelData }) {
  const fields: [string, string | null | undefined][] = [
    ["Customer", data.customer],
    ["Bundle No.", data.bundleNo],
    ["Prod Date", data.prodDate],
    ["Item", data.item],
    ["Thickness", data.thickness],
    ["Width", data.width],
    ["Cut Length", data.cutLength],
    ["Coating", data.coating],
    ["Temper", data.temper],
    ["Finish", data.finish],
    ["Tare Wt", data.tareWt],
    ["Gross Wt", data.grossWt],
    ["Net Wt", data.netWt],
    ["No. of Sheets", data.noOfSheets],
    ["T.C. No.", data.tcNo],
    ["Supplier Coil No.", data.supplierCoilNo],
    ["Remarks", data.remarks],
  ];

  return (
    <View style={styles.label}>
      <Text style={styles.labelTitle}>{COMPANY.name}</Text>
      {fields
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.labelText}>{label}:</Text>
            <Text style={styles.valueText}>{value}</Text>
          </View>
        ))}
    </View>
  );
}

// Prints 2 identical copies of the same label side by side, matching the source
// app's "2-up" coil ID label sheet triggered per Finished Goods row.
export function CoilLabelDocument({ data }: { data: CoilLabelData }) {
  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.labelsRow}>
          <LabelBox data={data} />
          <LabelBox data={data} />
        </View>
      </Page>
    </Document>
  );
}
