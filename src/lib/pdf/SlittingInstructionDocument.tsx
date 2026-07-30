import { Document, Page, Text, View } from "@react-pdf/renderer";
import { COMPANY, DocFooter, Field, styles } from "./theme";
import type { Prisma } from "@/generated/prisma/client";

type OrderWithMasters = Prisma.SlittingOrderSummaryGetPayload<{
  include: { customer: true };
}> & {
  masters: (Prisma.SlittingCustomerMasterGetPayload<Record<string, never>> | null)[];
};

const SLIT_KEYS = [1, 2, 3, 4] as const;

// Plant/factory letterhead (Taloja MIDC) rather than the registered-office one used
// on the PO Report — matches the real recovered layout for this document.
function PlantLetterhead() {
  return (
    <View>
      <Text style={styles.letterheadTitle}>{COMPANY.name}</Text>
      <Text style={styles.letterheadLine}>{COMPANY.plantAddress}</Text>
      <Text style={styles.letterheadLine}>Email: {COMPANY.plantEmail}</Text>
      <Text style={styles.docTitle}>SLITTING INSTRUCTION</Text>
      <View style={styles.headerRule} />
    </View>
  );
}

export function SlittingInstructionDocument({ order }: { order: OrderWithMasters }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PlantLetterhead />

        <View style={styles.fieldRow}>
          <Field label="Coil No." value={order.zsplId} />
          <Field label="Customer" value={order.customer?.displayName} />
          <Field label="Item Type" value={order.itemType} />
          <Field label="Thickness" value={order.thickness.toString()} />
          <Field label="Width" value={order.width.toString()} />
          <Field label="Coating" value={order.coating} />
          <Field label="Temper" value={order.temper} />
          <Field label="Finish" value={order.finish} />
          <Field label="Net Wt" value={order.netWt.toString()} />
          <Field label="Vendor Name" value={order.vendorName} />
          <Field
            label="Production Plan Date"
            value={order.productionPlanDate?.toISOString().slice(0, 10)}
          />
          <Field label="Truck No." value={order.truckNo} />
          <Field label="Job Work Vendor" value={order.jobWorkVendorName} />
        </View>

        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.thCell, { flex: 1 }]}>Slit #</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Slit Width</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>No. of Slits</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Width Tolerance</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>No. of Slits/Pallet</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Slit Wt</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Pallet Size</Text>
            <Text style={[styles.thCell, { flex: 1.2 }]}>Straping Type</Text>
          </View>
          {SLIT_KEYS.map((n) => {
            const slitWidth = order[`slit${n}` as "slit1"];
            const noOfSlit = order[`noOfSlit${n}` as "noOfSlit1"];
            const master = order.masters[n - 1];
            if (!slitWidth && !noOfSlit && !master) return null;
            return (
              <View key={n} style={styles.tr} wrap={false}>
                <Text style={[styles.tdCell, { flex: 1 }]}>{n}</Text>
                <Text style={[styles.tdCell, { flex: 1 }]}>
                  {slitWidth?.toString() ?? ""}
                </Text>
                <Text style={[styles.tdCell, { flex: 1 }]}>{noOfSlit ?? ""}</Text>
                <Text style={[styles.tdCell, { flex: 1 }]}>
                  {master?.widthTolerance ?? ""}
                </Text>
                <Text style={[styles.tdCell, { flex: 1 }]}>
                  {master?.noOfSlitPerPallet ?? ""}
                </Text>
                <Text style={[styles.tdCell, { flex: 1 }]}>{master?.slitWt ?? ""}</Text>
                <Text style={[styles.tdCell, { flex: 1.2 }]}>
                  {master?.palletSize ?? ""}
                </Text>
                <Text style={[styles.tdCell, { flex: 1.2 }]}>
                  {master?.slitStrapingType ?? ""}
                </Text>
              </View>
            );
          })}
        </View>

        <DocFooter code="PRD-T-05 REV.02 Dt.28.06.2023" />
      </Page>
    </Document>
  );
}
