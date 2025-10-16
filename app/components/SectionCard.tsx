import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { brand } from '../../theme/colors';

type IconInput =
  | ReactNode
  | string
  | { name: string; size?: number; color?: string }
  | null
  | undefined;

type Props = {
  icon?: IconInput;
  title: ReactNode;                // allow string or <Text/>
  summary?: string | ReactNode;    // optional subtext
  countBadge?: number | string | ReactNode;
  children?: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
};

function asIconEl(icon: IconInput): ReactNode {
  // Catch null, undefined, false, 0, empty string
  if (!icon) return null;

  // Already a valid React element? use as-is
  if (React.isValidElement(icon)) return icon;

  // String => treat as Ionicons name
  if (typeof icon === 'string') {
    return <Ionicons name={icon as any} size={16} color={brand.primary} />;
  }

  // Object form: must be an object AND have a 'name' property
  if (typeof icon === 'object' && icon !== null && 'name' in icon && typeof (icon as any).name === 'string') {
    const cfg = icon as { name: string; size?: number; color?: string };
    return (
      <Ionicons
        name={cfg.name as any}
        size={cfg.size ?? 16}
        color={cfg.color ?? brand.primary}
      />
    );
  }

  // Anything else (empty objects, arrays, etc.) -> ignore safely
  console.warn('[SectionCard] Invalid icon format:', icon);
  return null;
}

export default function SectionCard({
  icon,
  title,
  summary,
  countBadge,
  children,
}: Props) {
  const iconEl = asIconEl(icon);

  return (
    <View
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {iconEl ? <View style={{ marginRight: 8 }}>{iconEl}</View> : null}

        {/* Title */}
        {typeof title === 'string' ? (
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#14181F' }}>
            {title}
          </Text>
        ) : (
          title
        )}

        {/* Count badge (optional) */}
        {countBadge != null ? (
          <View
            style={{
              marginLeft: 'auto',
              backgroundColor: '#F1EEFF',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
            }}
          >
            {typeof countBadge === 'string' || typeof countBadge === 'number' ? (
              <Text style={{ color: brand.primary, fontWeight: '600' }}>
                {String(countBadge)}
              </Text>
            ) : (
              countBadge
            )}
          </View>
        ) : null}
      </View>

      {/* Summary (optional) */}
      {summary ? (
        <View style={{ marginTop: 6 }}>
          {typeof summary === 'string' ? (
            <Text style={{ color: '#6B7280' }}>{summary}</Text>
          ) : (
            summary
          )}
        </View>
      ) : null}

      {/* Body */}
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  );
}
