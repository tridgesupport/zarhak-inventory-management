import { Document, Page, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import { Table, type Column } from "./Table";
import type { Prisma } from "@/generated/prisma/client";

type DispatchRow = Prisma.DispatchSummaryGetPayload<{
  include: { customer: true; buyer: true; consignee: true };
}>;

const ITEM_COLUMNS: Column<DispatchRow>[] = [
  { header: "ZSPL / Bundle No.", width: 1.3, render: (r) => r.finalZsplId },
  { header: "Item", render: (r) => r.itemType },
  { header: "Thickness", render: (r) => r.thickness?.toString() },
  { header: "Width", render: (r) => r.width?.toString() },
  { header: "Cut Length", render: (r) => r.cutLength?.toString() },
  { header: "Origin", render: (r) => r.origin },
  { header: "Coating", render: (r) => r.coating },
  { header: "Temper", render: (r) => r.temper },
  { header: "Finish", render: (r) => r.finish },
  { header: "No. of Sheets", render: (r) => r.numberOfSheets?.toString() },
  { header: "Net Weight", render: (r) => r.netWeight?.toString() },
  { header: "Remark", width: 1.5, render: (r) => r.remarks },
];

export function PackingListDocument({ rows }: { rows: DispatchRow[] }) {
  const first = rows[0];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead title="DISPATCH RECORD" />

        <View style={styles.fieldRow}>
          <Field label="DO Number" value={first?.doNumber} />
          <Field label="DO Date" value={first?.doDate?.toISOString().slice(0, 10)} />
          <Field label="Buyer" value={first?.buyer?.displayName ?? first?.customer?.displayName} />
          <Field label="Buyer GSTIN" value={first?.buyer?.gstin} />
          <Field label="Consignee" value={first?.consignee?.displayName} />
          <Field label="Consignee GSTIN" value={first?.consignee?.gstin} />
          <Field label="Transporter" value={first?.transporterName} />
          <Field label="Vehicle No." value={first?.vehicleNumber} />
        </View>

        <Table columns={ITEM_COLUMNS} rows={rows} />

        <DocFooter code="STR-T-10 REV.0 Dt.01.08.2021" />
      </Page>
    </Document>
  );
}
