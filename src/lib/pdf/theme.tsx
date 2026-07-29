import { StyleSheet, Text, View } from "@react-pdf/renderer";

// Real letterhead recovered from the business's own report samples ("hardik po
// report.pdf" etc.) — used verbatim rather than guessed.
export const COMPANY = {
  name: "ZARHAK STEELS PRIVATE LIMITED",
  registeredAddress: "22 Nariman Bhavan, 227, Nariman Point, Mumbai - 400021",
  phone: "6658 0800/812",
  fax: "6658 0888",
  cin: "U27110MH1988PTC046875",
  email: "office@zarhak.com",
  plantAddress: "Plot No. C25, Taloja MIDC, Navi Mumbai",
  plantEmail: "billing@zarhak.com",
};

export const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  letterheadTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
  },
  letterheadLine: {
    fontSize: 8,
    textAlign: "center",
    color: "#444",
  },
  docTitle: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: 700,
    textAlign: "center",
    textDecoration: "underline",
  },
  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginTop: 6,
    marginBottom: 8,
  },
  fieldRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  field: {
    width: "50%",
    flexDirection: "row",
    marginBottom: 3,
  },
  fieldLabel: {
    fontWeight: 700,
    marginRight: 4,
  },
  table: {
    marginTop: 6,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
  },
  thCell: {
    padding: 3,
    fontWeight: 700,
    fontSize: 7.5,
    backgroundColor: "#f0f0f0",
    borderRightWidth: 0.5,
    borderRightColor: "#999",
  },
  tdCell: {
    padding: 3,
    fontSize: 7.5,
    borderRightWidth: 0.5,
    borderRightColor: "#999",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#666",
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    paddingTop: 4,
  },
});

export function Letterhead({ title }: { title: string }) {
  return (
    <View>
      <Text style={styles.letterheadTitle}>{COMPANY.name}</Text>
      <Text style={styles.letterheadLine}>{COMPANY.registeredAddress}</Text>
      <Text style={styles.letterheadLine}>
        Tel: {COMPANY.phone} · Fax: {COMPANY.fax} · CIN: {COMPANY.cin} · Email:{" "}
        {COMPANY.email}
      </Text>
      <Text style={styles.docTitle}>{title}</Text>
      <View style={styles.headerRule} />
    </View>
  );
}

export function DocFooter({ code }: { code: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{code}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

// A labelled field that renders nothing when the value is empty — mirrors the
// business rule captured off the real PO report: blank fields/columns are omitted
// from the printed document entirely rather than shown empty.
export function Field({ label, value }: { label: string; value?: string | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}:</Text>
      <Text>{value}</Text>
    </View>
  );
}
