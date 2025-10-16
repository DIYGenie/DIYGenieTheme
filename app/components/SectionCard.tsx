import React, { useState, isValidElement } from "react";
import { View, Text, Pressable } from "react-native";
import { brand } from "../../theme/colors";

type Props = {
  icon?: React.ReactNode; // must be a React element if provided
  title: string; // rendered inside <Text>
  summary?: string | number | React.ReactNode; // string/number -> Text, node -> View
  countBadge?: string | number; // rendered as Text (stringified)
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children?: React.ReactNode;
};

const styles = {
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headRow: { flexDirection: "row", alignItems: "center" as const },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2EDFF",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#121212",
    flex: 1,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#EFEAFE",
    color: brand.purple || "#700",
    fontWeight: "600" as const,
    overflow: "hidden" as const,
  },
  summaryText: { marginTop: 6, color: "#6B7280" },
  divider: { height: 12 },
};

function Summary({ value }: { value?: Props["summary"] }) {
  if (value === null || value === undefined) return null;

  // Strings / numbers -> render in <Text>
  if (typeof value === "string" || typeof value === "number") {
    return <Text style={styles.summaryText}>{String(value)}</Text>;
  }

  // React elements -> render directly in a View
  if (isValidElement(value)) {
    return <View style={{ marginTop: 6 }}>{value}</View>;
  }

  // Anything else (plain objects, arrays of non-elements) -> ignore safely
  return null;
}

export default function SectionCard({
  icon,
  title,
  summary,
  countBadge,
  defaultOpen = true,
  isOpen,
  onToggle,
  children,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    setInternalOpen(next);
    onToggle?.(next);
  };

  const showIcon = isValidElement(icon) ? icon : null;

  return (
    <View style={styles.card}>
      <Pressable onPress={handleToggle} style={styles.headRow}>
        {showIcon ? <View style={styles.iconWrap}>{showIcon}</View> : null}
        <Text style={styles.title}>{title}</Text>
        {countBadge !== undefined && countBadge !== null ? (
          <Text style={styles.badge}>{String(countBadge)}</Text>
        ) : null}
      </Pressable>

      <Summary value={summary} />

      {open ? (
        <>
          <View style={styles.divider} />
          {children}
        </>
      ) : null}
    </View>
  );
}