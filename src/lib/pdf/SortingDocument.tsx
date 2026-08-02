import { Document, Page, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import { Table, type Column } from "./Table";
import type { Prisma } from "@/generated/prisma/client";

type OrderWithBundles = Prisma.CuttingOrderSummaryGetPayload<{
  include: { customer: true; bundlewiseData: true };
}>;
type Bundle = OrderWithBundles["bundlewiseData"][number];

const REJECT_SCRAP_IDS = ["XX", "YY"];

// Best-effort rendition — the AppSheet audit confirmed this report existed as a
// distinct format per Cutting order but didn't capture its exact field list, so this
// covers the fields most useful for a sorting-floor checklist. Adjust once the real
// source-app layout is available.
export function SortingDocument({ order }: { order: OrderWithBundles }) {
  const bundles = order.bundlewiseData.filter((b) => !REJECT_SCRAP_IDS.includes(b.bundleIdNo));

  const columns: Column<Bundle>[] = [
    { header: "Bundle ID", width: 0.7, render: (b) => b.bundleIdNo },
    { header: "No. of Sheets", render: (b) => b.noOfSheets?.toString() },
    { header: "Net Wt", render: (b) => b.netBundleWt?.toString() },
    { header: "Prepared By", render: (b) => b.preparedBy },
    { header: "Sorted By", render: () => "" },
    { header: "Remarks", width: 2, render: () => "" },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead title="SORTING REPORT" />
        <View style={styles.fieldRow}>
          <Field label="Coil No." value={order.zsplId} />
          <Field label="Customer" value={order.customer?.displayName} />
          <Field label="Item" value={order.itemType} />
          <Field label="Spec" value={`${order.thickness}x${order.width} ${order.coating}/${order.temper}`} />
        </View>
        <Table columns={columns} rows={bundles} />
        <DocFooter code="PRD-T-02 Rev.00" />
      </Page>
    </Document>
  );
}
