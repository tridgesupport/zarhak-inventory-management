import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Letterhead, DocFooter, Field, styles } from "./theme";
import { Table, type Column } from "./Table";
import type { Prisma } from "@/generated/prisma/client";

type PoWithItems = Prisma.PurchaseOrderGetPayload<{ include: { items: true } }>;
type Item = PoWithItems["items"][number];

const TERMS = [
  "Material to be supplied strictly as per IS 1993/2018 (or the grade specified on this order).",
  "Coil weight to be within the standard weight range agreed for this item.",
  "Packing: Eye-to-Sky, adequately protected for in-transit handling.",
  "Delivery: at our GST-registered Taloja location unless otherwise specified above.",
  "Weight chargeable will be the net weight recorded at our end on receipt.",
  "Payment terms: 21 days from the date of receipt, unless otherwise agreed in writing.",
];

const ITEM_COLUMNS: Column<Item>[] = [
  { header: "Item Type", width: 1.2, render: (i) => i.itemType },
  { header: "Thick (mm)", render: (i) => i.thickness.toString() },
  { header: "Width (mm)", render: (i) => i.width.toString() },
  { header: "Length (mm)", render: (i) => i.length?.toString() },
  { header: "Coating", render: (i) => i.coating },
  { header: "Temper", render: (i) => i.temper },
  { header: "Finish", render: (i) => i.finish },
  { header: "Grade", render: (i) => i.grade },
  { header: "Annealed", render: (i) => i.annealedType },
  { header: "Qty (Mt)", render: (i) => i.qtyMt.toString() },
  { header: "Coil ID", render: (i) => i.coilId },
  { header: "Price (Rs.)", render: (i) => i.purchasePrice?.toString() },
  { header: "Vendor ID No.", width: 1.3, render: (i) => i.vendorIdNo },
  { header: "Product Category", width: 1.3, render: (i) => i.productCategory },
  { header: "Steel Type", render: (i) => i.steelType },
  { header: "Sleeve Type", render: (i) => i.sleeveType },
  { header: "Remark", width: 1.5, render: (i) => i.itemRemark },
];

export function PoReportDocument({ po }: { po: PoWithItems }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead title="PURCHASE ORDER" />

        <View style={styles.fieldRow}>
          <Field label="Purchase Order No." value={po.poNumber} />
          <Field label="Purchase Order Date" value={po.poDate.toISOString().slice(0, 10)} />
          <Field label="Order Category" value={po.orderCategory} />
          <Field label="Vendor Name" value={po.vendorName} />
          <Field label="Mill" value={po.mill} />
          <Field label="Consignee" value={po.shipTo} />
          <Field label="Comments" value={po.remark} />
        </View>

        <Table columns={ITEM_COLUMNS} rows={po.items} />

        <View style={{ marginTop: 14 }}>
          <Text style={{ fontWeight: 700, marginBottom: 3 }}>
            Terms &amp; Conditions
          </Text>
          {TERMS.map((t, i) => (
            <Text key={i} style={{ fontSize: 7.5, marginBottom: 2 }}>
              {i + 1}. {t}
            </Text>
          ))}
        </View>

        <DocFooter code="PUR-T-02 REV.01 Dt.19.10.2024" />
      </Page>
    </Document>
  );
}
