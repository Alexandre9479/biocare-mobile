import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator, Alert
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { colors, sale } from '../theme'

export default function EquipmentDetailScreen({ route, navigation }: any) {
  const { equipmentId } = route.params
  const [equipment, setEquipment] = useState<any>(null)
  const [logs, setLogs]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: eq }, { data: logData }, { data: me }] = await Promise.all([
        supabase.from('equipment').select('*').eq('id', equipmentId).single(),
        supabase.from('service_logs')
          .select('id, service_date, service_type, findings, total_charge, payment_status, engineer_id')
          .eq('equipment_id', equipmentId)
          .order('service_date', { ascending: false })
          .limit(5),
        supabase.auth.getUser(),
      ])

      if (eq) {
        const [catRes, subRes, regRes] = await Promise.all([
          eq.category_id    ? supabase.from('categories').select('name').eq('id', eq.category_id).single()    : { data: null },
          eq.subcategory_id ? supabase.from('subcategories').select('name').eq('id', eq.subcategory_id).single() : { data: null },
          eq.region_id      ? supabase.from('regions').select('name').eq('id', eq.region_id).single()         : { data: null },
        ])
        setEquipment({ ...eq, category: catRes.data, subcategory: subRes.data, region: regRes.data })
      }

      if (logData?.length) {
        const engIds = [...new Set(logData.map(l => l.engineer_id).filter(Boolean))]
        const { data: engs } = engIds.length
          ? await supabase.from('profiles').select('id, name').in('id', engIds)
          : { data: [] }
        setLogs(logData.map(l => ({ ...l, engineer: engs?.find(e => e.id === l.engineer_id) })))
      }

      // Check admin role
      if (me.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', me.user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }
      setLoading(false)
    }
    load()
  }, [equipmentId])

  const handleDelete = () => {
    Alert.alert(
      'Delete Equipment',
      `Delete ${equipment?.facility_name}? All service logs will also be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('equipment').delete().eq('id', equipmentId)
            if (error) Alert.alert('Error', error.message)
            else { Alert.alert('Deleted'); navigation.goBack() }
          }
        }
      ]
    )
  }

  if (loading) return <ActivityIndicator color={colors.purple} size="large" style={{ flex: 1, backgroundColor: colors.bg }} />
  if (!equipment) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Equipment not found</Text>
    </View>
  )

  const saleInfo  = sale[equipment.sale_type as keyof typeof sale] ?? sale.cash
  const days      = equipment.next_service_date
    ? Math.round((new Date(equipment.next_service_date).getTime() - Date.now()) / 86400000)
    : null
  const isOverdue = days !== null && days < 0

  const svcLabels: Record<string, string> = {
    preventive: 'Preventive', corrective: 'Corrective',
    installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.facilityName}>{equipment.facility_name}</Text>
        <Text style={styles.sn}>S/N: {equipment.serial_number}</Text>

        {/* Sale type + service badge */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <View style={[styles.badge, { backgroundColor: saleInfo.bg }]}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: saleInfo.dot }} />
            <Text style={[styles.badgeText, { color: saleInfo.text }]}>
              {equipment.sale_type === 'cash' ? 'Cash Sale' : equipment.sale_type === 'placement' ? 'Placement' : 'Hire Purchase'}
            </Text>
          </View>
          {days !== null && (
            <View style={[styles.badge, { backgroundColor: isOverdue ? '#7F1D1D' : days <= 7 ? '#78350F' : '#064E3B' }]}>
              <Text style={[styles.badgeText, { color: isOverdue ? '#FCA5A5' : days <= 7 ? '#FDE68A' : '#6EE7B7' }]}>
                {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d to service`}
              </Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {/* QR Code */}
          <TouchableOpacity style={styles.actionBtn}
            onPress={() => navigation.navigate('QRCode', { equipment: { ...equipment, subcategory: equipment.subcategory, region: equipment.region } })}>
            <Ionicons name="qr-code-outline" size={16} color={colors.cyan} />
            <Text style={[styles.actionBtnText, { color: colors.cyan }]}>QR Code</Text>
          </TouchableOpacity>

          {/* Service History */}
          <TouchableOpacity style={styles.actionBtn}
            onPress={() => navigation.navigate('EquipmentHistory', { equipmentId })}>
            <Ionicons name="time-outline" size={16} color="#8B5CF6" />
            <Text style={[styles.actionBtnText, { color: '#8B5CF6' }]}>History</Text>
          </TouchableOpacity>

          {/* Edit — admin only */}
          {isAdmin && (
            <TouchableOpacity style={styles.actionBtn}
              onPress={() => navigation.navigate('EditEquipment', { equipmentId })}>
              <Ionicons name="pencil-outline" size={16} color={colors.emerald} />
              <Text style={[styles.actionBtnText, { color: colors.emerald }]}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* Delete — admin only */}
          {isAdmin && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7F1D1D22', borderColor: '#EF444433' }]}
              onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Equipment Details</Text>
        <View style={styles.divider} />
        {[
          ['Category',     equipment.category?.name],
          ['Model',        equipment.subcategory?.name],
          ['Region',       equipment.region?.name],
          ['County',       equipment.county],
          ['Status',       equipment.status?.toUpperCase()],
          ['Installed',    equipment.installation_date],
          ['Service Every',equipment.service_interval_days ? `${equipment.service_interval_days} days` : null],
          ['Last Service', equipment.last_service_date],
          ['Next Service', equipment.next_service_date],
          ['Warranty',     equipment.warranty_expiry_date],
        ].filter(([, v]) => v).map(([label, value]) => (
          <View key={label as string} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
        {equipment.notes ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.rowLabel}>Notes</Text>
            <Text style={[styles.rowValue, { textAlign: 'left', marginTop: 3 }]}>{equipment.notes}</Text>
          </View>
        ) : null}
      </View>

      {/* HP Details */}
      {equipment.sale_type === 'hire_purchase' && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hire Purchase Details</Text>
          <View style={styles.divider} />
          {/* Progress bar */}
          {equipment.hp_total_installments > 0 && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={styles.rowLabel}>Payment Progress</Text>
                <Text style={styles.rowLabel}>{equipment.hp_installments_paid ?? 0} / {equipment.hp_total_installments} paid</Text>
              </View>
              <View style={{ height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: colors.cyan, borderRadius: 4, width: `${Math.min(100, ((equipment.hp_installments_paid ?? 0) / equipment.hp_total_installments) * 100)}%` as any }} />
              </View>
            </View>
          )}
          {[
            ['Total Price',   equipment.hp_total_price     ? `KES ${equipment.hp_total_price?.toLocaleString()}` : null],
            ['Down Payment',  equipment.hp_down_payment    ? `KES ${equipment.hp_down_payment?.toLocaleString()}` : null],
            ['Installment',   equipment.hp_installment_amount ? `KES ${equipment.hp_installment_amount?.toLocaleString()}` : null],
            ['Frequency',     equipment.hp_installment_frequency],
            ['HP Status',     equipment.hp_payment_status],
            ['Final Payment', equipment.hp_final_payment_date],
          ].filter(([, v]) => v).map(([label, value]) => (
            <View key={label as string} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Contact */}
      {(equipment.facility_contact_name || equipment.facility_contact_phone || equipment.facility_contact_email) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Facility Contact</Text>
          <View style={styles.divider} />
          {equipment.facility_contact_name && (
            <Text style={{ color: colors.text, marginBottom: 8 }}>{equipment.facility_contact_name}</Text>
          )}
          {equipment.facility_contact_phone && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${equipment.facility_contact_phone}`)}>
              <Ionicons name="call" size={15} color="#34D399" />
              <Text style={{ color: '#34D399', fontSize: 14, fontWeight: '600' }}>{equipment.facility_contact_phone}</Text>
            </TouchableOpacity>
          )}
          {equipment.facility_contact_email && (
            <TouchableOpacity style={[styles.contactBtn, { marginTop: 6 }]} onPress={() => Linking.openURL(`mailto:${equipment.facility_contact_email}`)}>
              <Ionicons name="mail" size={15} color={colors.cyan} />
              <Text style={{ color: colors.cyan, fontSize: 13 }}>{equipment.facility_contact_email}</Text>
            </TouchableOpacity>
          )}
          {equipment.facility_address && (
            <TouchableOpacity style={[styles.contactBtn, { marginTop: 6 }]}
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(equipment.facility_address)}`)}>
              <Ionicons name="navigate" size={15} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{equipment.facility_address}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Service billing info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service Billing</Text>
        <View style={styles.divider} />
        {equipment.sale_type === 'cash' && (
          <View style={styles.billingBox}>
            <Text style={styles.billingTitle}>Chargeable Service</Text>
            <Text style={styles.billingDesc}>Customer pays all service and parts fees.</Text>
          </View>
        )}
        {equipment.sale_type === 'placement' && (
          <View style={[styles.billingBox, { borderColor: '#F9730033', backgroundColor: '#F9730010' }]}>
            <Text style={[styles.billingTitle, { color: '#FB923C' }]}>Free Service (Placement)</Text>
            <Text style={styles.billingDesc}>All maintenance covered by Biocare.</Text>
          </View>
        )}
        {equipment.sale_type === 'hire_purchase' && (
          <View style={[styles.billingBox, {
            borderColor: equipment.hp_payment_status === 'active' ? '#3B82F633' : '#F9730033',
            backgroundColor: equipment.hp_payment_status === 'active' ? '#3B82F610' : '#F9730010',
          }]}>
            <Text style={[styles.billingTitle, { color: equipment.hp_payment_status === 'active' ? '#93C5FD' : '#FB923C' }]}>
              {equipment.hp_payment_status === 'active' ? 'Free Service (Under HP)' : 'Chargeable (HP Completed)'}
            </Text>
            <Text style={styles.billingDesc}>
              {equipment.hp_payment_status === 'active' ? 'Free until all installments are paid.' : 'Payment complete. Service fees apply.'}
            </Text>
          </View>
        )}
      </View>

      {/* Recent service history */}
      {logs.length > 0 && (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Recent Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EquipmentHistory', { equipmentId })}>
              <Text style={{ color: colors.cyan, fontSize: 12, fontWeight: '600' }}>View All →</Text>
            </TouchableOpacity>
          </View>
          {logs.map(l => (
            <View key={l.id} style={styles.logRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.logDate}>{l.service_date}</Text>
                <Text style={styles.logType}>{svcLabels[l.service_type] ?? l.service_type} · {l.engineer?.name ?? '—'}</Text>
              </View>
              {l.total_charge > 0
                ? <Text style={styles.logCharge}>KES {l.total_charge.toLocaleString()}</Text>
                : <View style={styles.freeTag}><Text style={styles.freeTagText}>Free</Text></View>}
            </View>
          ))}
        </View>
      )}

      {/* Log Service button */}
      <TouchableOpacity style={styles.logBtn}
        onPress={() => navigation.navigate('LogService', { assignmentId: null, equipmentId })}>
        <Ionicons name="clipboard" size={20} color="#fff" />
        <Text style={styles.logBtnText}>Log Service Visit</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  headerCard:  { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  facilityName: { fontSize: 20, fontWeight: '800', color: colors.text },
  sn:          { fontSize: 12, fontFamily: 'monospace', color: colors.textMuted, marginTop: 4 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  actionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  card:        { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: colors.text },
  divider:     { height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel:    { fontSize: 12, color: colors.textDim, flex: 1 },
  rowValue:    { fontSize: 13, color: colors.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  contactBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#065F4622', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  billingBox:  { backgroundColor: '#065F4622', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#10B98133' },
  billingTitle: { fontSize: 13, fontWeight: '700', color: '#34D399', marginBottom: 3 },
  billingDesc: { fontSize: 12, color: colors.textMuted },
  logRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder },
  logDate:     { fontSize: 12, fontWeight: '600', color: colors.text },
  logType:     { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  logCharge:   { fontSize: 13, fontWeight: '700', color: colors.emerald },
  freeTag:     { backgroundColor: '#065F46', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  freeTagText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  logBtn:      { backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  logBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
})
