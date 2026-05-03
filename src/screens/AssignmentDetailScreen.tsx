import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, sale } from '../theme'

export default function AssignmentDetailScreen({ route, navigation }: any) {
  const { assignment: a } = route.params
  const eq = a.equipment

  const serviceLabels: Record<string, string> = {
    preventive: 'Preventive Maintenance', corrective: 'Corrective Maintenance',
    installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
  }
  const priorityColors: Record<string, string> = {
    low: '#64748B', medium: '#3B82F6', high: '#F97316', urgent: '#EF4444',
  }

  const saleInfo = sale[eq?.sale_type as keyof typeof sale] ?? sale.cash

  const call = () => {
    if (!eq?.facility_contact_phone) return
    Linking.openURL(`tel:${eq.facility_contact_phone}`)
  }

  const whatsapp = () => {
    if (!eq?.facility_contact_phone) return
    const msg = encodeURIComponent(`Hello, I am a Biocare service engineer. I am scheduled to service your ${eq?.subcategory?.name ?? 'equipment'}.`)
    Linking.openURL(`whatsapp://send?phone=${eq.facility_contact_phone}&text=${msg}`)
      .catch(() => Alert.alert('WhatsApp not installed'))
  }

  const maps = () => {
    if (!eq?.facility_address) return
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(eq.facility_address)}`)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Equipment info */}
      <View style={styles.card}>
        <Text style={styles.facilityName}>{eq?.facility_name ?? 'Unknown Facility'}</Text>
        <Text style={styles.model}>{eq?.subcategory?.name ?? '—'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: saleInfo.dot }} />
          <Text style={{ color: saleInfo.text, fontSize: 12, fontWeight: '600' }}>
            {eq?.sale_type === 'cash' ? 'Cash Sale' : eq?.sale_type === 'placement' ? 'Placement — Free Service' : 'Hire Purchase'}
          </Text>
        </View>

        <View style={styles.divider} />

        <Row label="Serial Number" value={eq?.serial_number} mono />
        <Row label="Status" value={eq?.status?.toUpperCase()} />
        <Row label="Next Service Due" value={eq?.next_service_date ? new Date(eq.next_service_date).toLocaleDateString('en-KE') : '—'} />
        <Row label="Last Service" value={eq?.last_service_date ? new Date(eq.last_service_date).toLocaleDateString('en-KE') : '—'} />
      </View>

      {/* Assignment info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Service Job</Text>
        <View style={styles.divider} />
        <Row label="Scheduled Date" value={a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'} />
        <Row label="Service Type" value={serviceLabels[a.service_type] ?? a.service_type ?? '—'} />
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.label}>Priority</Text>
          <View style={{ backgroundColor: `${priorityColors[a.priority] ?? '#64748B'}22`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
            <Text style={{ color: priorityColors[a.priority] ?? '#64748B', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' }}>{a.priority}</Text>
          </View>
        </View>
        {a.special_instructions ? (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsLabel}>⚠️ Special Instructions</Text>
            <Text style={styles.instructionsText}>{a.special_instructions}</Text>
          </View>
        ) : null}
      </View>

      {/* Contact info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Facility Contact</Text>
        <View style={styles.divider} />
        {eq?.facility_contact_name && <Row label="Contact Person" value={eq.facility_contact_name} />}
        {eq?.facility_address && <Row label="Address" value={eq.facility_address} />}

        {eq?.facility_contact_phone && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#065F46' }]} onPress={call}>
              <Ionicons name="call" size={18} color="#34D399" />
              <Text style={[styles.actionBtnText, { color: '#34D399' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#064E3B' }]} onPress={whatsapp}>
              <Ionicons name="logo-whatsapp" size={18} color="#34D399" />
              <Text style={[styles.actionBtnText, { color: '#34D399' }]}>WhatsApp</Text>
            </TouchableOpacity>
            {eq?.facility_address && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1E3A8A' }]} onPress={maps}>
                <Ionicons name="navigate" size={18} color="#93C5FD" />
                <Text style={[styles.actionBtnText, { color: '#93C5FD' }]}>Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Log service button */}
      <TouchableOpacity
        style={styles.logBtn}
        onPress={() => navigation.navigate('LogService', { assignment: a })}
      >
        <Ionicons name="clipboard" size={20} color="#fff" />
        <Text style={styles.logBtnText}>Log This Service</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && { fontFamily: 'monospace' }]}>{value ?? '—'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  card:            { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  facilityName:    { fontSize: 18, fontWeight: '800', color: colors.text },
  model:           { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: colors.text },
  divider:         { height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 },
  row:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  label:           { fontSize: 12, color: colors.textDim, flex: 1 },
  value:           { fontSize: 13, color: colors.text, fontWeight: '500', flex: 2, textAlign: 'right' },
  instructionsBox: { backgroundColor: '#78350F22', borderRadius: 10, padding: 12, marginTop: 10 },
  instructionsLabel: { fontSize: 12, fontWeight: '700', color: '#FDE68A', marginBottom: 4 },
  instructionsText:  { fontSize: 13, color: '#FDE68A' },
  actionRow:       { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText:   { fontSize: 13, fontWeight: '600' },
  logBtn:          { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 30 },
  logBtnText:      { color: '#fff', fontSize: 17, fontWeight: '700' },
})
