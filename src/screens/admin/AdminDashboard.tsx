import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

interface Stats {
  total: number
  cash: number
  placement: number
  hire_purchase: number
  pending: number
  overdue: number
  completedMonth: number
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function AdminDashboard({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [stats, setStats]           = useState<Stats | null>(null)
  const [pendingJobs, setPendingJobs] = useState<any[]>([])
  const [overdue, setOverdue]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [{ data: eq }, { count: pending }, { data: logs }, { data: overdueEq }] = await Promise.all([
        supabase.from('equipment').select('id, sale_type, next_service_date'),
        supabase.from('service_assignments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_logs').select('id').gte('service_date', firstDay),
        supabase.from('equipment').select('id, serial_number, facility_name, sale_type, next_service_date, subcategory_id')
          .lt('next_service_date', today).eq('status', 'active').order('next_service_date').limit(5),
      ])

      const equipment = eq ?? []
      setStats({
        total: equipment.length,
        cash: equipment.filter(e => e.sale_type === 'cash').length,
        placement: equipment.filter(e => e.sale_type === 'placement').length,
        hire_purchase: equipment.filter(e => e.sale_type === 'hire_purchase').length,
        pending: pending ?? 0,
        overdue: equipment.filter(e => e.next_service_date && new Date(e.next_service_date) < new Date()).length,
        completedMonth: logs?.length ?? 0,
      })

      // Enrich overdue with subcategory names
      if (overdueEq?.length) {
        const subIds = [...new Set(overdueEq.map(e => e.subcategory_id).filter(Boolean))]
        const { data: subs } = subIds.length
          ? await supabase.from('subcategories').select('id, name').in('id', subIds)
          : { data: [] }
        setOverdue(overdueEq.map(e => ({ ...e, subcategory: subs?.find(s => s.id === e.subcategory_id) })))
      }

      // Pending assignments
      const { data: assigns } = await supabase
        .from('service_assignments')
        .select('id, equipment_id, priority, created_at')
        .eq('status', 'pending')
        .order('created_at')
        .limit(5)

      if (assigns?.length) {
        const equipIds = assigns.map(a => a.equipment_id)
        const { data: equips } = await supabase
          .from('equipment').select('id, facility_name, sale_type, next_service_date, subcategory_id')
          .in('id', equipIds)
        const subIds = [...new Set((equips ?? []).map(e => e.subcategory_id).filter(Boolean))]
        const { data: subs } = subIds.length
          ? await supabase.from('subcategories').select('id, name').in('id', subIds)
          : { data: [] }
        setPendingJobs(assigns.map(a => {
          const eq = equips?.find(e => e.id === a.equipment_id)
          return { ...a, equipment: eq ? { ...eq, subcategory: subs?.find(s => s.id === eq.subcategory_id) } : null }
        }))
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const days = (date?: string) => date
    ? Math.round((new Date(date).getTime() - Date.now()) / 86400000)
    : null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day, {profile.name.split(' ')[0]} 👋</Text>
            <Text style={styles.subGreeting}>Biocare Admin Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('ScanQR')}>
            <Ionicons name="qr-code-outline" size={22} color={colors.cyan} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Equipment stats */}
            <Text style={styles.sectionTitle}>Equipment Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total" value={stats?.total ?? 0} color={colors.cyan} icon="hardware-chip-outline" />
              <StatCard label="Pending" value={stats?.pending ?? 0} color={colors.orange} icon="clipboard-outline" />
              <StatCard label="Overdue" value={stats?.overdue ?? 0} color="#EF4444" icon="warning-outline" />
              <StatCard label="Done (Month)" value={stats?.completedMonth ?? 0} color={colors.emerald} icon="checkmark-circle-outline" />
            </View>

            {/* Sale type breakdown */}
            <Text style={styles.sectionTitle}>By Sale Type</Text>
            <View style={styles.saleRow}>
              {[
                { label: 'Cash Sale', count: stats?.cash ?? 0, dot: '#10B981', bg: '#065F46' },
                { label: 'Placement', count: stats?.placement ?? 0, dot: '#F97316', bg: '#7C2D12' },
                { label: 'Hire Purchase', count: stats?.hire_purchase ?? 0, dot: '#3B82F6', bg: '#1E3A8A' },
              ].map(s => (
                <View key={s.label} style={[styles.saleCard, { borderLeftColor: s.dot, borderLeftWidth: 3 }]}>
                  <Text style={[styles.saleCount, { color: s.dot }]}>{s.count}</Text>
                  <Text style={styles.saleLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Pending Assignments */}
            {pendingJobs.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Needs Assignment</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Assignments')}>
                    <Text style={styles.seeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>
                {pendingJobs.map(a => {
                  const d = days(a.equipment?.next_service_date)
                  return (
                    <TouchableOpacity key={a.id} style={styles.jobCard}
                      onPress={() => navigation.navigate('Assignments')}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobFacility} numberOfLines={1}>{a.equipment?.facility_name ?? '—'}</Text>
                        <Text style={styles.jobModel}>{a.equipment?.subcategory?.name ?? '—'}</Text>
                        {a.equipment?.next_service_date && (
                          <Text style={styles.jobDate}>Due: {new Date(a.equipment.next_service_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</Text>
                        )}
                      </View>
                      <View style={styles.jobRight}>
                        {d !== null && (
                          <View style={{ backgroundColor: d < 0 ? '#7F1D1D' : '#78350F', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 6 }}>
                            <Text style={{ color: d < 0 ? '#FCA5A5' : '#FDE68A', fontSize: 11, fontWeight: '700' }}>
                              {d < 0 ? `${Math.abs(d)}d over` : `${d}d left`}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.assignText}>Assign →</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </>
            )}

            {/* Overdue */}
            {overdue.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 8 }]}>🔴 Overdue Services</Text>
                {overdue.map(e => (
                  <TouchableOpacity key={e.id} style={[styles.jobCard, { borderLeftColor: '#EF4444', borderLeftWidth: 3 }]}
                    onPress={() => navigation.navigate('Equipment', { screen: 'EquipmentDetail', params: { equipmentId: e.id } })}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobFacility} numberOfLines={1}>{e.facility_name}</Text>
                      <Text style={styles.jobModel}>{e.subcategory?.name} • S/N: {e.serial_number}</Text>
                    </View>
                    <View style={styles.jobRight}>
                      <Text style={{ color: '#FCA5A5', fontSize: 12, fontWeight: '700' }}>
                        {Math.abs(days(e.next_service_date) ?? 0)}d overdue
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  scroll:       { flex: 1 },
  content:      { padding: 16, paddingBottom: 32 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting:     { fontSize: 20, fontWeight: '800', color: colors.text },
  subGreeting:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  scanBtn:      { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  seeAll:       { color: colors.cyan, fontSize: 13, fontWeight: '600' },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:     { flex: 1, minWidth: '44%', backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.cardBorder },
  statValue:    { fontSize: 26, fontWeight: '800' },
  statLabel:    { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  saleRow:      { flexDirection: 'row', gap: 8 },
  saleCard:     { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.cardBorder },
  saleCount:    { fontSize: 22, fontWeight: '800' },
  saleLabel:    { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  jobCard:      { backgroundColor: colors.card, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder },
  jobFacility:  { fontSize: 14, fontWeight: '700', color: colors.text },
  jobModel:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  jobDate:      { fontSize: 11, color: colors.textDim, marginTop: 4 },
  jobRight:     { alignItems: 'flex-end', marginLeft: 12 },
  assignText:   { color: colors.cyan, fontSize: 12, fontWeight: '700' },
})
