import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{value}</Text>
    </View>
  )
}

export default function AnalyticsScreen() {
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [{ data: eq }, { data: logs }, { data: assignments }] = await Promise.all([
        supabase.from('equipment').select('sale_type, status, category_id, region_id'),
        supabase.from('service_logs').select('total_charge, service_type, engineer_id, service_date').gte('service_date', firstDay),
        supabase.from('service_assignments').select('status, engineer_id').in('status', ['completed', 'scheduled', 'in_progress']),
      ])

      // Revenue
      const revenue = (logs ?? []).reduce((s, l) => s + (l.total_charge ?? 0), 0)
      const freeServices = (logs ?? []).filter(l => !l.total_charge).length

      // By sale type
      const byType = {
        cash: (eq ?? []).filter(e => e.sale_type === 'cash').length,
        placement: (eq ?? []).filter(e => e.sale_type === 'placement').length,
        hire_purchase: (eq ?? []).filter(e => e.sale_type === 'hire_purchase').length,
      }

      // By service type
      const svcMap: Record<string, number> = {}
      ;(logs ?? []).forEach(l => { if (l.service_type) svcMap[l.service_type] = (svcMap[l.service_type] ?? 0) + 1 })

      // Engineer performance
      const engMap: Record<string, number> = {}
      ;(assignments ?? []).filter(a => a.status === 'completed').forEach(a => {
        if (a.engineer_id) engMap[a.engineer_id] = (engMap[a.engineer_id] ?? 0) + 1
      })

      const engIds = Object.keys(engMap)
      const { data: engs } = engIds.length
        ? await supabase.from('profiles').select('id, name').in('id', engIds)
        : { data: [] }

      const engPerf = (engs ?? []).map(e => ({ name: e.name, count: engMap[e.id] ?? 0 }))
        .sort((a, b) => b.count - a.count)

      setData({ revenue, freeServices, byType, svcMap, engPerf, totalLogs: (logs ?? []).length, totalEq: (eq ?? []).length })
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const maxSvc = data ? Math.max(...Object.values(data.svcMap as Record<string, number>), 1) : 1
  const maxEng = data ? Math.max(...data.engPerf.map((e: any) => e.count), 1) : 1

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Analytics</Text>
        <Text style={styles.pageSub}>Current month</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : data && (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}>

          {/* KPIs */}
          <View style={styles.kpiGrid}>
            {[
              { label: 'Total Equipment', value: data.totalEq, color: colors.cyan },
              { label: 'Services (Month)', value: data.totalLogs, color: colors.purple },
              { label: 'Revenue (Month)', value: `KES ${(data.revenue / 1000).toFixed(0)}K`, color: colors.emerald },
              { label: 'Free Services', value: data.freeServices, color: '#F97316' },
            ].map(k => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={styles.kpiLabel}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* Sale type */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Equipment by Sale Type</Text>
            <View style={styles.saleRow}>
              {[
                { label: 'Cash', value: data.byType.cash, color: '#10B981' },
                { label: 'Placement', value: data.byType.placement, color: '#F97316' },
                { label: 'HP', value: data.byType.hire_purchase, color: '#3B82F6' },
              ].map(s => (
                <View key={s.label} style={styles.saleBlock}>
                  <Text style={[styles.saleNum, { color: s.color }]}>{s.value}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={[styles.saleDot, { backgroundColor: s.color }]} />
                    <Text style={styles.saleLabel}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Service types */}
          {Object.keys(data.svcMap).length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Services by Type</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {Object.entries(data.svcMap as Record<string, number>)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <Bar key={type} label={type.charAt(0).toUpperCase() + type.slice(1)} value={count} max={maxSvc} color={colors.purple} />
                  ))}
              </View>
            </View>
          )}

          {/* Engineer performance */}
          {data.engPerf.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Engineer Performance</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {data.engPerf.map((e: any) => (
                  <Bar key={e.name} label={e.name} value={e.count} max={maxEng} color={colors.cyan} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  header:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSub:   { fontSize: 12, color: colors.textMuted },
  content:   { padding: 12, gap: 12, paddingBottom: 32 },
  kpiGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard:   { flex: 1, minWidth: '44%', backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  kpiValue:  { fontSize: 22, fontWeight: '800' },
  kpiLabel:  { fontSize: 10, color: colors.textMuted, marginTop: 3, textAlign: 'center' },
  card:      { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  saleRow:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 },
  saleBlock: { alignItems: 'center', gap: 6 },
  saleNum:   { fontSize: 28, fontWeight: '800' },
  saleDot:   { width: 6, height: 6, borderRadius: 3 },
  saleLabel: { fontSize: 11, color: colors.textMuted },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:  { width: 80, fontSize: 11, color: colors.textMuted },
  barTrack:  { flex: 1, height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 4 },
  barValue:  { width: 28, fontSize: 12, fontWeight: '700', textAlign: 'right' },
})
