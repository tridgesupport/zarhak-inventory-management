import { inwardTemplateCsv } from "@/lib/csv/inward";

export async function GET() {
  const csv = inwardTemplateCsv();
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="inward-template.csv"',
    },
  });
}
