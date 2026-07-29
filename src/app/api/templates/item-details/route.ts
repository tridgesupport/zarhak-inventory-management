import { itemDetailsTemplateCsv } from "@/lib/csv/itemDetails";

export async function GET() {
  const csv = itemDetailsTemplateCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="item-details-template.csv"',
    },
  });
}
