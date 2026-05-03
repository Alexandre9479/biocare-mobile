export const colors = {
  bg:          '#0F172A',
  card:        '#1E293B',
  cardBorder:  '#334155',
  purple:      '#7B2D8B',
  purpleLight: '#9D4EAA',
  cyan:        '#00ACC1',
  red:         '#D32F2F',
  emerald:     '#10B981',
  orange:      '#F59E0B',
  blue:        '#3B82F6',
  text:        '#F1F5F9',
  textMuted:   '#94A3B8',
  textDim:     '#64748B',
  white:       '#FFFFFF',
}

export const sale = {
  cash:          { bg: '#065F46', text: '#34D399', dot: '#10B981' },
  placement:     { bg: '#7C2D12', text: '#FB923C', dot: '#F97316' },
  hire_purchase: { bg: '#1E3A8A', text: '#93C5FD', dot: '#3B82F6' },
}

export const s = {
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  } as const,
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  label: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F1F5F9',
  },
  badge: (bg: string, text: string) => ({
    backgroundColor: bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  }),
  badgeText: (color: string) => ({
    fontSize: 11,
    fontWeight: '600' as const,
    color,
  }),
  btn: {
    backgroundColor: '#7B2D8B',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  btnSecondaryText: {
    color: '#CBD5E1',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F1F5F9',
    fontSize: 15,
  },
}
