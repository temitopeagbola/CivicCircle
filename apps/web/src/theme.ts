import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import type { Category, ReportStatus, Severity } from '@civiccircle/shared';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const colors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  textSubtle: '#64748B',
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#CCFBF1',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warningSoft: '#FEF3C7',
  warningText: '#92400E',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  focus: '#2563EB',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const maxContentWidth = 720;

export const font = {
  family: Platform.select({
    web: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    default: undefined,
  }),
};

/** Text/background pairs chosen for ≥ 4.5:1 contrast. */
export const severityStyle: Record<Severity, { fg: string; bg: string; marker: string }> = {
  low: { fg: '#166534', bg: '#DCFCE7', marker: '#16A34A' },
  medium: { fg: '#854D0E', bg: '#FEF9C3', marker: '#CA8A04' },
  high: { fg: '#9A3412', bg: '#FFEDD5', marker: '#EA580C' },
  urgent: { fg: '#991B1B', bg: '#FEE2E2', marker: '#DC2626' },
};

export const statusStyle: Record<ReportStatus, { fg: string; bg: string; icon: IconName }> = {
  open: { fg: '#1E40AF', bg: '#DBEAFE', icon: 'radio-button-on' },
  acknowledged: { fg: '#5B21B6', bg: '#EDE9FE', icon: 'eye' },
  in_progress: { fg: '#854D0E', bg: '#FEF9C3', icon: 'construct' },
  resolved: { fg: '#166534', bg: '#DCFCE7', icon: 'checkmark-circle' },
  duplicate: { fg: '#334155', bg: '#E2E8F0', icon: 'copy' },
};

export const categoryIcon: Record<Category, IconName> = {
  roads: 'car',
  lighting: 'bulb',
  waste: 'trash',
  graffiti: 'brush',
  water: 'water',
  parks: 'leaf',
  traffic: 'warning',
  pavements: 'walk',
  other: 'help-circle',
};
