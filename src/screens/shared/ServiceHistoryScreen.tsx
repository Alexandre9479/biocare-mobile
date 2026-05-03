import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Image, Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

const SVC_LABELS: Record<string, string> = {
  preventive: 'Preventive', corrective: 'Corrective',
  installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
}

export default function ServiceHistoryScreen({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [logs, setLogs]         = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    try {
      let q = supabase
        .from('service_logs')
        .select('id, equipment_id, engineer_id, service_date, service_type, findings, actions_taken, total_charge, service_charge, parts_charge, charge_status, payment_status, client_feedback')
        .order('service_date', { ascending: false })
        .limit(80)

      if (profile.role === 'engineer') q = q.eq('engineer_id', profile.id)

      const { data } = await q
      if (!data?.length) { setLogs([]); return }

      const equipIds = [...new Set(data.map(l => l.equipment_id).filter(Boolean))]
      const engIds   = [...new Set(data.map(l => l.engineer_id).filter(Boolean))]

      const [{ data: equips }, { data: engs }, { data: parts }, { data: images }] = await Promise.all([
        equipIds.length ? supabase.from('equipment').select('id, serial_number, facility_name, sale_type, subcategory_id').in('id', equipIds) : { data: [] },
        engIds.length   ? supabase.from('profiles').select('id, name').in('id', engIds) : { data: [] },
        supabase.from('service_parts').select('*').in('service_log_id', data.map(l => l.id)),
        supabase.from('service_images').select('id, service_log_id, image_url, image_type').in('service_log_id', data.map(l => l.id)),
      ])

      const subIds = [...new Set((equips ?? []).map((e: any) => e.subcategory_id).filter(Boolean))]
      const { data: subs } = subIds.length
        ? await supabase.from('subcategories').select('id, name').in('id', subIds)
        : { data: [] }

      setLogs(data.map(l => {
        const eq = equips?.find((e: any) => e.id === l.equipment_id)
        return {
          ...l,
          equipment: eq ? { ...eq, subcategory: subs?.find((s: any) => s.id === eq.subcategory_id) } : null,
          engineer: engs?.find((e: any) => e.id === l.engineer_id),
          parts: (parts ?? []).filter(p => p.service_log_id === l.id),
          images: (images ?? []).filter(i => i.service_log_id === l.id),
        }
      }))
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const totalRevenue = logs.reduce((s, l) => s + (l.total_charge ?? 0), 0)
  const freeCount    = logs.filter(l => !l.total_charge).length

  const renderItem = ({ item: log }: { item: any }) => {
    const isOpen = expanded === log.id
    return (
      <View style={styles.card}>
        {/* Header */}
        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : log.id)}>
          <View style={styles.logHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.facility} numberOfLines={1}>{log.equipment?.facility_name ?? '—'}</Text>
              <Text style={styles.model}>{log.equipment?.subcategory?.name} • {log.equipment?.serial_number}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={styles.date}>{log.service_date}</Text>
                {log.service_type && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{SVC_LABELS[log.service_type]}</Text>
                  </View>
                )}
                <Text style={styles.eng}>By: {log.engineer?.name ?? '—'}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {log.total_charge > 0
                ? <Text style={styles.charge}>KES {log.total_charge.toLocaleString()}</Text>
                : <View style={styles.freeBadge}><Text style={styles.freeText}>Free</Text></View>}
              <View style={[styles.payBadge, { backgroundColor: log.payment_status === 'paid' ? '#065F46' : log.payment_status === 'waived' ? '#292524' : '#78350F' }]}>
                <Text style={{ color: log.payment_status === 'paid' ? '#34D399' : log.payment_status === 'waived' ? '#A8A29E' : '#FDE68A', fontSize: 10, fontWeight: '700' }}>
                  {log.payment_status}
                </Text>
              </View>
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded */}
        {isOpen && (
          <View style={styles.expanded}>
            {log.charge_status ? <Text style={styles.chargeStatus}>{log.charge_status}</Text> : null}
            {log.findings ? (
              <View style={styles.section}>
                <Text style={styles.secLabel}>Findings</Text>
                <Text style={styles.secText}>{log.findings}</Text>
              </View>
            ) : null}
            {log.actions_taken ? (
              <View style={styles.section}>
                <Text style={styles.secLabel}>Actions Taken</Text>
                <Text style={styles.secText}>{log.actions_taken}</Text>
              </View>
            ) : null}
            {log.parts?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secLabel}>Parts Used</Text>
                {log.parts.map((p: any) => (
                  <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.secText}>{p.part_name} × {p.quantity}</Text>
                    <Text style={styles.secText}>KES {p.total_cost?.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
            {log.images?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.secLabel}>Photos ({log.images.length})</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {log.images.map((img: any) => (
                    <TouchableOpacity key={img.id} onPress={() => Linking.openURL(img.image_url)}>
                      <Image source={{ uri: img.image_url }} style={styles.thumb} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {log.client_feedback ? (
              <View style={styles.section}>
                <Text style={styles.secLabel}>Client Feedback</Text>
                <Text style={[styles.secText, { fontStyle: 'italic' }]}>"{log.client_feedback}"</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{logs.length}</Text>
          <Text style={styles.summaryLabel}>Services</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: colors.emerald }]}>
            {totalRevenue > 0 ? `KES ${(totalRevenue / 1000).toFixed(0)}K` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: '#F97316' }]}>{freeCount}</Text>
          <Text style={styles.summaryLabel}>Free</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={l => l.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>No service records yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  summary:      { flexDirection: 'row', gap: 10, padding: 12 },
  summaryCard:  { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  summaryVal:   { fontSize: 20, fontWeight: '800', color: colors.text },
  summaryLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  card:         { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  logHeader:    { flexDirection: 'row', padding: 14 },
  facility:     { fontSize: 14, fontWeight: '700', color: colors.text },
  model:        { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  date:         { fontSize: 11, color: colors.textDim },
  eng:          { fontSize: 11, color: colors.textDim },
  typeBadge:    { backgroundColor: '#1E293B', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  typeBadgeText: { fontSize: 10, color: colors.textMuted },
  charge:       { fontSize: 15, fontWeight: '800', color: colors.emerald },
  freeBadge:    { backgroundColor: '#065F46', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freeText:     { color: '#34D399', fontSize: 10, fontWeight: '700' },
  payBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  expanded:     { borderTopWidth: 1, borderTopColor: colors.cardBorder, padding: 14, gap: 10 },
  chargeStatus: { fontSize: 11, color: colors.textMuted, backgroundColor: '#0F172A', borderRadius: 8, padding: 8 },
  section:      { gap: 4 },
  secLabel:     { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  secText:      { fontSize: 13, color: colors.text, lineHeight: 18 },
  thumb:        { width: 70, height: 70, borderRadius: 8 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:    { color: colors.textMuted, fontSize: 15 },
})
