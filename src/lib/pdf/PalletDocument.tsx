import { Document, Page, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import { Table, type Column } from "./Table";
import type { Prisma } from "@/generated/prisma/client";

type OrderWithBundles = Prisma.CuttingOrderSummaryGetPayload<{
  include: { customer: true; bundlewiseData: true };
}>;
type Bundle = OrderWithBundles["bundlewiseData"][number];

const REJECT_SCRAP_IDS = ["XX", "YY"];

// Best-effort rendition — see SortingDocument.tsx for the same caveat: the audit
// confirmed this report existed per Cutting order but not its exact field list.
// This covers the pallet-wise weight fields already recorded per bundle.
export function PalletDocument({ order }: { order: OrderWithBundles }) {
  const bundles = order.bundlewiseData.filter((b) => !REJECT_SCRAP_IDS.includes(b.bundleIdNo));

  const columns: Column<Bundle>[] = [
    { header: "Bundle ID", render: (b) => b.bundleIdNo },
    { header: "No. of Sheets", render: (b) => b.noOfSheets?.toString() },
    { header: "Pallet Wt", render: (b) => b.palletWeight?.toString() },
    { header: "Gross Bundle Wt", render: (b) => b.grossBundleWt?.toString() },
    { header: "Net Bundle Wt", render: (b) => b.netBundleWt?.toString() },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead title="PALLET REPORT" />
        <View style={styles.fieldRow}>
          <Field label="Coil No." value={order.zsplId} />
          <Field label="Customer" value={order.customer?.displayName} />
          <Field label="Item" value={order.itemType} />
        </View>
        <Table columns={columns} rows={bundles} />
        <DocFooter code="PRD-T-04 Rev.00" />
      </Page>
    </Document>
  );
}
