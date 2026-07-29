import { Text, View } from "@react-pdf/renderer";
import { styles } from "./theme";

export interface Column<T> {
  header: string;
  width?: number; // flex-basis weight; columns without one share the remainder equally
  render: (row: T) => string | null | undefined;
}

function isBlank(value: string | null | undefined) {
  return value === null || value === undefined || value === "";
}

// Renders a table but drops any column that is blank across every row — matches the
// business rule captured off the real PO report sample ("blank columns must be
// omitted from the rendered PDF entirely, not shown empty").
export function Table<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  const visible = columns.filter((col) => rows.some((row) => !isBlank(col.render(row))));

  return (
    <View style={styles.table}>
      <View style={styles.tr}>
        {visible.map((col, i) => (
          <Text
            key={i}
            style={[styles.thCell, { flex: col.width ?? 1 }]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.tr} wrap={false}>
          {visible.map((col, ci) => (
            <Text key={ci} style={[styles.tdCell, { flex: col.width ?? 1 }]}>
              {col.render(row) ?? ""}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
