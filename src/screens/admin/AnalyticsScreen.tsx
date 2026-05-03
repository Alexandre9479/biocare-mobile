import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  ActivityIndicator, Dimensions
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BarChart } from 'react-native-gifted-charts'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

const W = Dimensions.get('window').width

// ── Simple donut ring using Views ─────────────────────────────────────────────
function DonutSegment({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  // Approximated using a colored border arc — simple and reliable
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: size * 0.14, borderColor: color, opacity: pct > 0 ? 1 : 0.2 }} />
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
  return (
    <View style={hb.row}>
      <Text style={hb.label} numberOfLines={1}>{label}</Text>
      <View style={hb.track}>
        <View style={[hb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[hb.val, { color }]}>{value}</Text>
    </View>
  )
}
const hb = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  label: { width: 90, fontSize: 11, color: colors.textMuted },
  track: { flex: 1, height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 5 },
  val:   { width: 28, fontSize: 12, fontWeight: '800', textAlign: 'right' },
})

export default function AnalyticsScreen() {
  const [data, setData]             = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [{ data: eq }, { data: logs }, { data: assigns }] = await Promise.all([
        supabase.from('equipment').select('sale_type, status, category_id'),
        supabase.from('service_logs').select('total_charge, service_type, engineer_id, service_date, payment_status'),
        supabase.from('service_assignments').select('status, engineer_id'),
      ])

      const equipment  = eq ?? []
      const allLogs    = logs ?? []
      const monthLogs  = allLogs.filter(l => l.service_date >= firstDay)

      const revenue    = monthLogs.reduce((s, l) => s + (l.total_charge ?? 0), 0)
      const freeCount  = monthLogs.filter(l => !l.total_charge).length

      const byType = {
        cash:          equipment.filter(e => e.sale_type === 'cash').length,
        placement:     equipment.filter(e => e.sale_type === 'placement').length,
        hire_purchase: equipment.filter(e => e.sale_type === 'hire_purchase').length,
      }

      // Monthly revenue (last 6 months)
      const monthlyMap: Record<string, number> = {}
      allLogs.forEach(l => {
        const mon = l.service_date?.slice(0, 7)
        if (mon) monthlyMap[mon] = (monthlyMap[mon] ?? 0) + (l.total_charge ?? 0)
      })
      const monthlyBars = Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, val]) => ({
          value: Math.round(val / 1000),
          label: month.slice(5),
          frontColor: colors.purple,
        }))

      // Service type breakdown
      const svcMap: Record<string, number> = {}
      monthLogs.forEach(l => { if (l.service_type) svcMap[l.service_type] = (svcMap[l.service_type] ?? 0) + 1 })

      // Engineer performance (completed)
      const engMap: Record<string, number> = {}
      ;(assigns ?? []).filter(a => a.status === 'completed').forEach(a => {
        if (a.engineer_id) engMap[a.engineer_id] = (engMap[a.engineer_id] ?? 0) + 1
      })

      const engIds = Object.keys(engMap)
      const { data: engs } = engIds.length
        ? await supabase.from('profiles').select('id, name').in('id', engIds)
        : { data: [] }

      const engPerf = (engs ?? [])
        .map(e => ({ name: e.name.split(' ')[0], count: engMap[e.id] ?? 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      setData({
        totalEq: equipment.length,
        totalLogs: monthLogs.length,
        totalAllTime: allLogs.length,
        revenue, freeCount, byType,
        monthlyBars: monthlyBars.length > 0 ? monthlyBars : [{ value: 0, label: 'No data', frontColor: colors.purple }],
        svcMap,
        engPerf,
      })
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const maxSvc = data ? Math.max(...Object.values<number>(data.svcMap ?? {}), 1) : 1
  const maxEng = data ? Math.max(...(data.engPerf ?? []).map((e: any) => e.count), 1) : 1
  const total  = data ? data.byType.cash + data.byType.placement + data.byType.hire_purchase : 1

  const SVC_LABELS: Record<string, string> = {
    preventive: 'Preventive', corrective: 'Corrective',
    installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hdr}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.sub}>All-time + current month</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
        >
          {/* KPI row */}
          <View style={styles.kpiRow}>
            {[
              { label: 'Equipment',   value: data.totalEq,      color: colors.cyan    },
              { label: 'This Month',  value: data.totalLogs,    color: colors.purple  },
              { label: 'All Time',    value: data.totalAllTime, color: '#8B5CF6'      },
              { label: 'Free (month)',value: data.freeCount,    color: '#F97316'      },
            ].map(k => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={[styles.kpiVal, { color: k.color }]}>{k.value}</Text>
                <Text style={styles.kpiLbl}>{k.label}</Text>
              </View>
            ))}
          </View>

          {/* Revenue card */}
          <View style={styles.revenueCard}>
            <Text style={styles.cardTitle}>Revenue This Month</Text>
            <Text style={styles.revenueAmt}>KES {data.revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.revenueSub}>{data.totalLogs} services · {data.freeCount} free · {data.totalLogs - data.freeCount} chargeable</Text>
          </View>

          {/* Equipment by sale type — donut + legend */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Equipment by Sale Type</Text>
            <View style={styles.saleRow}>
              {[
                { label: 'Cash Sale',     value: data.byType.cash,          color: '#10B981' },
                { label: 'Placement',     value: data.byType.placement,      color: '#F97316' },
                { label: 'Hire Purchase', value: data.byType.hire_purchase,  color: '#3B82F6' },
              ].map(s => (
                <View key={s.label} style={styles.saleItem}>
                  <Text style={[styles.saleNum, { color: s.color }]}>{s.value}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
                    <Text style={styles.saleLbl}>{s.label.split(' ')[0]}</Text>
                  </View>
                  <View style={styles.saleBar}>
                    <View style={{
                      height: '100%',
                      width: `${total > 0 ? (s.value / total) * 100 : 0}%` as any,
                      backgroundColor: s.color,
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Monthly revenue bar chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Revenue (KES '000)</Text>
            {data.monthlyBars[0]?.value > 0 ? (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <BarChart
                  data={data.monthlyBars}
                  barWidth={28}
                  spacing={16}
                  roundedTop
                  hideRules
                  xAxisColor={colors.cardBorder}
                  yAxisColor={colors.cardBorder}
                  yAxisTextStyle={{ color: colors.textDim, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(...data.monthlyBars.map((b: any) => b.value)) * 1.2}
                  width={W - 80}
                  height={160}
                  backgroundColor={colors.card}
                />
              </View>
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No revenue data yet</Text>
                <Text style={styles.noDataSub}>Service logs will populate this chart</Text>
              </View>
            )}
          </View>

          {/* Service type breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Services by Type (This Month)</Text>
            {Object.keys(data.svcMap).length > 0 ? (
              <View style={{ marginTop: 10 }}>
                {Object.entries<number>(data.svcMap)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <HBar key={type} label={SVC_LABELS[type] ?? type} value={count} max={maxSvc} color={colors.purple} />
                  ))}
              </View>
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No services logged this month</Text>
              </View>
            )}
          </View>

          {/* Engineer performance */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Engineer Performance (All Time)</Text>
            {data.engPerf.length > 0 ? (
              <View style={{ marginTop: 10 }}>
                {data.engPerf.map((e: any, i: number) => (
                  <HBar key={i} label={e.name} value={e.count} max={maxEng} color={colors.cyan} />
                ))}
              </View>
            ) : (
              <View style={styles.noData}>
                <Text style={styles.noDataText}>No completed assignments yet</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  hdr:         { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '800', color: colors.text },
  sub:         { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  content:     { padding: 12, gap: 12, paddingBottom: 40 },
  kpiRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard:     { flex: 1, minWidth: '44%', backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  kpiVal:      { fontSize: 24, fontWeight: '800' },
  kpiLbl:      { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  revenueCard: { backgroundColor: `${colors.emerald}15`, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: `${colors.emerald}30`, alignItems: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '700', color: colors.text },
  revenueAmt:  { fontSize: 30, fontWeight: '800', color: colors.emerald, marginTop: 6 },
  revenueSub:  { fontSize: 11, color: `${colors.emerald}99`, marginTop: 4 },
  card:        { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  saleRow:     { flexDirection: 'row', gap: 8, marginTop: 14 },
  saleItem:    { flex: 1, alignItems: 'center' },
  saleNum:     { fontSize: 26, fontWeight: '800' },
  saleLbl:     { fontSize: 10, color: colors.textMuted },
  saleBar:     { width: '100%', height: 6, backgroundColor: '#0F172A', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  noData:      { alignItems: 'center', paddingVertical: 20, gap: 6 },
  noDataText:  { color: colors.textMuted, fontSize: 13 },
  noDataSub:   { color: colors.textDim, fontSize: 11 },
})
