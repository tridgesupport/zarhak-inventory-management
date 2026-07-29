import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import type { Prisma } from "@/generated/prisma/client";

type OrderWithBundles = Prisma.CuttingOrderSummaryGetPayload<{
  include: { customer: true; bundlewiseData: true };
}>;

const REJECT_SCRAP_IDS = ["XX", "YY"];

const gridStyles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#999" },
  labelCell: {
    width: 90,
    padding: 3,
    fontSize: 7.5,
    fontWeight: 700,
    backgroundColor: "#f0f0f0",
    borderRightWidth: 0.5,
    borderRightColor: "#999",
  },
  cell: {
    flex: 1,
    padding: 3,
    fontSize: 7.5,
    textAlign: "center",
    borderRightWidth: 0.5,
    borderRightColor: "#999",
  },
});

// Bundles run across columns and fields run down rows — the real "Daily
// Bundle-wise Production Record" layout, transposed from the usual row-per-record
// table, so this is a bespoke grid rather than the shared <Table>.
export function BundleSlipDocument({ order }: { order: OrderWithBundles }) {
  const bundles = order.bundlewiseData;
  const primeBundles = bundles.filter((b) => !REJECT_SCRAP_IDS.includes(b.bundleIdNo));
  const rejectScrapBundles = bundles.filter((b) => REJECT_SCRAP_IDS.includes(b.bundleIdNo));

  const totalPalletWt = sumDecimal(bundles, "palletWeight");
  const totalPrimeNetWt = sumDecimal(primeBundles, "netBundleWt");
  const totalNetWt = sumDecimal(bundles, "netBundleWt");
  const rejectedWt = sumDecimal(rejectScrapBundles, "netBundleWt");
  const coilNetWt = Number(order.netWt);
  const diffWt = coilNetWt - totalNetWt;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Letterhead title="DAILY BUNDLE-WISE PRODUCTION RECORD" />

        <View style={styles.fieldRow}>
          <Field label="Customer" value={order.customer?.displayName} />
          <Field label="Coil No." value={order.zsplId} />
          <Field label="Item" value={order.itemType} />
          <Field label="Thickness" value={order.thickness.toString()} />
          <Field label="Coil Width" value={order.width.toString()} />
          <Field label="Cut Length" value={order.length?.toString()} />
          <Field label="Mill" value={order.mill} />
          <Field label="Coating" value={order.coating} />
          <Field label="Temper" value={order.temper} />
          <Field label="Finish" value={order.finish} />
          <Field label="Coil Weight" value={order.netWt.toString()} />
          <Field label="Status" value={order.productionStatus} />
        </View>

        <View style={{ marginTop: 6 }}>
          <View style={gridStyles.row}>
            <Text style={gridStyles.labelCell}></Text>
            {bundles.map((b) => (
              <Text key={b.id} style={gridStyles.cell}>
                {b.bundleIdNo}
              </Text>
            ))}
          </View>
          <GridRow label="No. of Sheets" bundles={bundles} field="noOfSheets" />
          <GridRow label="Pallet Wt" bundles={bundles} field="palletWeight" />
          <GridRow label="Gr Bdl Wt" bundles={bundles} field="grossBundleWt" />
          <GridRow label="Nt Bdl Wt" bundles={bundles} field="netBundleWt" />
        </View>

        <View style={{ marginTop: 10, flexDirection: "row", gap: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 700, marginBottom: 3 }}>Totals</Text>
            <SummaryLine label="Total Pallet Wt" value={totalPalletWt.toFixed(3)} />
            <SummaryLine
              label="Total Net Wt of Prime Bundles"
              value={totalPrimeNetWt.toFixed(3)}
            />
            <SummaryLine label="Diff. in Wt" value={diffWt.toFixed(3)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 700, marginBottom: 3 }}>Summary</Text>
            <SummaryLine label="No. of Coils" value="1" />
            <SummaryLine label="No. of Bundles" value={String(primeBundles.length)} />
            <SummaryLine label="Rejected Wt" value={rejectedWt.toFixed(3)} />
            <SummaryLine label="Total Wt of Coils/Bundles" value={coilNetWt.toFixed(3)} />
            <SummaryLine
              label="Balance Coil Qty"
              value={order.availableWeight.toString()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 700, marginBottom: 3 }}>Approval</Text>
            <SummaryLine label="Prepared By" value={bundles[0]?.preparedBy} />
            <SummaryLine label="Reviewed By" value={order.approvedBy} />
            <SummaryLine
              label="Review Date"
              value={order.approvedAt?.toISOString().slice(0, 10)}
            />
          </View>
        </View>

        <DocFooter code="PRD-T-01 Rev.00, Dt. 01/03/2020" />
      </Page>
    </Document>
  );
}

function sumDecimal<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((sum, row) => {
    const value = row[key];
    return sum + (value ? Number(value) : 0);
  }, 0);
}

// Unlike <Field> (built for the 2-column fieldRow at the top of the page), these
// stack in narrow single-column blocks, so each line just renders full-width.
function SummaryLine({ label, value }: { label: string; value?: string | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <Text style={{ fontSize: 8, marginBottom: 2 }}>
      <Text style={{ fontWeight: 700 }}>{label}: </Text>
      {value}
    </Text>
  );
}

function GridRow({
  label,
  bundles,
  field,
}: {
  label: string;
  bundles: OrderWithBundles["bundlewiseData"];
  field: "noOfSheets" | "palletWeight" | "grossBundleWt" | "netBundleWt";
}) {
  return (
    <View style={gridStyles.row}>
      <Text style={gridStyles.labelCell}>{label}</Text>
      {bundles.map((b) => {
        const value = b[field];
        return (
          <Text key={b.id} style={gridStyles.cell}>
            {value !== null && value !== undefined ? value.toString() : ""}
          </Text>
        );
      })}
    </View>
  );
}
