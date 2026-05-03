import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { colors, sale } from '../theme'
import type { Assignment, Profile } from '../types'

function SaleTypeBadge({ type }: { type: string }) {
  const info = sale[type as keyof typeof sale] ?? sale.cash
  return (
    <View style={{ backgroundColor: info.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: info.dot }} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: info.text }}>
        {type === 'cash' ? 'Cash Sale' : type === 'placement' ? 'Placement' : 'Hire Purchase'}
      </Text>
    </View>
  )
}

function UrgencyBadge({ days }: { days: number | null }) {
  if (days === null) return null
  const isOverdue = days < 0
  const isDueSoon = days <= 7
  const bg    = isOverdue ? '#7F1D1D' : isDueSoon ? '#78350F' : '#064E3B'
  const color = isOverdue ? '#FCA5A5' : isDueSoon ? '#FDE68A' : '#6EE7B7'
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color }}>
        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
      </Text>
    </View>
  )
}

export default function EngineerDashboard({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAssignments = async () => {
    try {
      const { data: assigns, error } = await supabase
        .from('service_assignments')
        .select('id, equipment_id, scheduled_date, service_type, status, priority, special_instructions')
        .eq('engineer_id', profile.id)
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })

      if (error) throw error
      if (!assigns?.length) { setAssignments([]); return }

      const equipIds = assigns.map(a => a.equipment_id).filter(Boolean)
      const { data: equips } = await supabase
        .from('equipment')
        .select('id, serial_number, facility_name, sale_type, status, next_service_date, facility_contact_phone, facility_address, subcategory_id, region_id')
        .in('id', equipIds)

      const subIds = [...new Set((equips ?? []).map(e => e.subcategory_id).filter(Boolean))]
      const { data: subs } = subIds.length
        ? await supabase.from('subcategories').select('id, name').in('id', subIds)
        : { data: [] }

      const withEquip = assigns.map(a => {
        const eq = equips?.find(e => e.id === a.equipment_id)
        return {
          ...a,
          equipment: eq ? { ...eq, subcategory: subs?.find(s => s.id === eq.subcategory_id) } : undefined,
        }
      })
      setAssignments(withEquip as any)
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchAssignments() }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayJobs = assignments.filter(a => a.scheduled_date === today && a.status !== 'completed')
  const upcoming  = assignments.filter(a => a.status !== 'completed' && a.scheduled_date && a.scheduled_date > today)
  const completed = assignments.filter(a => a.status === 'completed').length

  const getDays = (date?: string) => {
    if (!date) return null
    return Math.round((new Date(date).getTime() - Date.now()) / 86400000)
  }

  const serviceLabel = (t?: string) => {
    const m: Record<string, string> = { preventive: 'Preventive', corrective: 'Corrective', installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency' }
    return t ? m[t] ?? t : ''
  }

  const renderItem = ({ item: a }: { item: any }) => {
    const eq  = a.equipment
    const days = getDays(eq?.next_service_date)
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AssignmentDetail', { assignment: a })}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.facilityName} numberOfLines={1}>{eq?.facility_name ?? 'Unknown Facility'}</Text>
            <Text style={styles.model}>{eq?.subcategory?.name ?? '—'} • S/N: {eq?.serial_number ?? '—'}</Text>
          </View>
          {a.priority === 'urgent' && (
            <View style={styles.urgentBadge}><Text style={styles.urgentText}>URGENT</Text></View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {eq?.sale_type && <SaleTypeBadge type={eq.sale_type} />}
          <UrgencyBadge days={days} />
          {a.service_type && (
            <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{serviceLabel(a.service_type)}</Text></View>
          )}
        </View>

        {a.scheduled_date && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.date}>{new Date(a.scheduled_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
          </View>
        )}

        {eq?.facility_contact_phone && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Ionicons name="call-outline" size={13} color={colors.cyan} />
            <Text style={{ color: colors.cyan, fontSize: 12 }}>{eq.facility_contact_phone}</Text>
          </View>
        )}

        {a.special_instructions ? (
          <Text style={styles.instructions} numberOfLines={2}>⚠️ {a.special_instructions}</Text>
        ) : null}

        <View style={styles.logBtn}>
          <Text style={styles.logBtnText}>Log Service →</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Today', value: todayJobs.length, color: colors.orange },
          { label: 'Upcoming', value: upcoming.length, color: colors.cyan },
          { label: 'Done (Total)', value: completed, color: colors.emerald },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : assignments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.emerald} />
          <Text style={styles.emptyTitle}>No assignments yet</Text>
          <Text style={styles.emptyText}>Your admin will assign service jobs here.</Text>
        </View>
      ) : (
        <FlatList
          data={[...todayJobs, ...upcoming]}
          keyExtractor={a => a.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAssignments() }} tintColor={colors.purple} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            todayJobs.length > 0 ? (
              <Text style={styles.sectionHeader}>📅 Today's Jobs ({todayJobs.length})</Text>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  statsRow:      { flexDirection: 'row', padding: 16, gap: 10 },
  statCard:      { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  statValue:     { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel:     { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:          { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  cardHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  facilityName:  { fontSize: 15, fontWeight: '700', color: colors.text },
  model:         { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  urgentBadge:   { backgroundColor: '#7F1D1D', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urgentText:    { color: '#FCA5A5', fontSize: 10, fontWeight: '800' },
  typeBadge:     { backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  typeBadgeText: { color: colors.textMuted, fontSize: 10 },
  date:          { fontSize: 12, color: colors.textMuted },
  instructions:  { fontSize: 12, color: '#FDE68A', marginTop: 6, fontStyle: 'italic' },
  logBtn:        { marginTop: 12, backgroundColor: '#7B2D8B22', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  logBtnText:    { color: colors.purpleLight, fontWeight: '700', fontSize: 13 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText:     { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
})
