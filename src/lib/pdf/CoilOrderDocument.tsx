import { Document, Page, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import { Table, type Column } from "./Table";
import type { Prisma } from "@/generated/prisma/client";

type OrderWithBundles = Prisma.CuttingOrderSummaryGetPayload<{
  include: { customer: true; bundlewiseData: true };
}>;
type Bundle = OrderWithBundles["bundlewiseData"][number];
type SequencedBundle = Bundle & { seq: number };

const REJECT_SCRAP_IDS = ["XX", "YY"];

// Best-effort rendition — see SortingDocument.tsx for the same caveat: the audit
// confirmed this report existed per Cutting order but not its exact field list.
// This covers the production/loading sequence fields most useful for coil ordering.
export function CoilOrderDocument({ order }: { order: OrderWithBundles }) {
  const bundles: SequencedBundle[] = [...order.bundlewiseData]
    .filter((b) => !REJECT_SCRAP_IDS.includes(b.bundleIdNo))
    .sort((a, b) => a.bundleIdNo.localeCompare(b.bundleIdNo))
    .map((b, i) => ({ ...b, seq: i + 1 }));

  const columns: Column<SequencedBundle>[] = [
    { header: "Seq", width: 0.5, render: (b) => String(b.seq) },
    { header: "Bundle ID", render: (b) => b.bundleIdNo },
    { header: "Cut Length", render: (b) => b.cutLength?.toString() },
    { header: "Net Wt", render: (b) => b.netBundleWt?.toString() },
    { header: "Production Date", render: (b) => b.productionDate.toISOString().slice(0, 10) },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead title="COIL ORDER REPORT" />
        <View style={styles.fieldRow}>
          <Field label="Coil No." value={order.zsplId} />
          <Field label="Customer" value={order.customer?.displayName} />
          <Field label="Mill" value={order.mill} />
          <Field label="Coil Length" value={order.coilLength?.toString()} />
        </View>
        <Table columns={columns} rows={bundles} />
        <DocFooter code="PRD-T-03 Rev.00" />
      </Page>
    </Document>
  );
}
