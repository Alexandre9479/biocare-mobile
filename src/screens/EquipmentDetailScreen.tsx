import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { colors, sale } from '../theme'

export default function EquipmentDetailScreen({ route }: any) {
  const { equipmentId } = route.params
  const [equipment, setEquipment] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: eq }, { data: logData }] = await Promise.all([
        supabase.from('equipment').select('*').eq('id', equipmentId).single(),
        supabase.from('service_logs').select('id, service_date, service_type, findings, total_charge, payment_status').eq('equipment_id', equipmentId).order('service_date', { ascending: false }).limit(5),
      ])

      if (eq) {
        const [catRes, subRes, regRes] = await Promise.all([
          eq.category_id ? supabase.from('categories').select('name').eq('id', eq.category_id).single() : { data: null },
          eq.subcategory_id ? supabase.from('subcategories').select('name').eq('id', eq.subcategory_id).single() : { data: null },
          eq.region_id ? supabase.from('regions').select('name').eq('id', eq.region_id).single() : { data: null },
        ])
        setEquipment({ ...eq, category: catRes.data, subcategory: subRes.data, region: regRes.data })
      }
      setLogs(logData ?? [])
      setLoading(false)
    }
    load()
  }, [equipmentId])

  if (loading) return <ActivityIndicator color={colors.purple} size="large" style={{ flex: 1, backgroundColor: colors.bg }} />
  if (!equipment) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.text }}>Equipment not found</Text></View>

  const saleInfo = sale[equipment.sale_type as keyof typeof sale] ?? sale.cash
  const days = equipment.next_service_date
    ? Math.round((new Date(equipment.next_service_date).getTime() - Date.now()) / 86400000)
    : null
  const isOverdue = days !== null && days < 0

  const svcLabels: Record<string, string> = { preventive: 'Preventive', corrective: 'Corrective', installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency' }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <View style={styles.card}>
        <Text style={styles.facilityName}>{equipment.facility_name}</Text>
        <Text style={styles.sn}>S/N: {equipment.serial_number}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <View style={{ backgroundColor: saleInfo.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: saleInfo.dot }} />
            <Text style={{ color: saleInfo.text, fontSize: 11, fontWeight: '700' }}>
              {equipment.sale_type === 'cash' ? 'Cash Sale' : equipment.sale_type === 'placement' ? 'Placement' : 'Hire Purchase'}
            </Text>
          </View>
          {days !== null && (
            <View style={{ backgroundColor: isOverdue ? '#7F1D1D' : '#064E3B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: isOverdue ? '#FCA5A5' : '#6EE7B7', fontSize: 11, fontWeight: '700' }}>
                {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d to service`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Equipment Details</Text>
        <View style={styles.divider} />
        {[
          ['Category', equipment.category?.name],
          ['Model', equipment.subcategory?.name],
          ['Region', equipment.region?.name],
          ['County', equipment.county],
          ['Status', equipment.status?.toUpperCase()],
          ['Installed', equipment.installation_date],
          ['Last Service', equipment.last_service_date],
          ['Next Service', equipment.next_service_date],
          ['Service Interval', equipment.service_interval_days ? `Every ${equipment.service_interval_days} days` : null],
        ].map(([label, value]) => value ? (
          <View key={label as string} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ) : null)}
      </View>

      {/* Contact */}
      {(equipment.facility_contact_name || equipment.facility_contact_phone) && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Facility Contact</Text>
          <View style={styles.divider} />
          {equipment.facility_contact_name && <Text style={{ color: colors.text, marginBottom: 8 }}>{equipment.facility_contact_name}</Text>}
          {equipment.facility_contact_phone && (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${equipment.facility_contact_phone}`)}>
              <Ionicons name="call" size={16} color="#34D399" />
              <Text style={{ color: '#34D399', fontWeight: '600' }}>{equipment.facility_contact_phone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent service history */}
      {logs.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Service History</Text>
          <View style={styles.divider} />
          {logs.map(l => (
            <View key={l.id} style={[styles.row, { marginBottom: 10, alignItems: 'flex-start' }]}>
              <Text style={[styles.rowLabel, { paddingTop: 2 }]}>{l.service_date}</Text>
              <View style={{ flex: 2, alignItems: 'flex-end' }}>
                <Text style={styles.rowValue}>{svcLabels[l.service_type] ?? l.service_type ?? '—'}</Text>
                {l.total_charge > 0
                  ? <Text style={{ color: colors.emerald, fontSize: 12, marginTop: 2 }}>KES {l.total_charge.toLocaleString()}</Text>
                  : <Text style={{ color: '#34D399', fontSize: 12, marginTop: 2 }}>Free</Text>}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  card:         { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  facilityName: { fontSize: 18, fontWeight: '800', color: colors.text },
  sn:           { fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  divider:      { height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel:     { fontSize: 12, color: colors.textDim, flex: 1 },
  rowValue:     { fontSize: 13, color: colors.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  callBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#065F46', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
})
