import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, FlatList
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile, ServiceType, Priority } from '../../types'

const SALE_COLORS: Record<string, string> = {
  cash: '#10B981', placement: '#F97316', hire_purchase: '#3B82F6',
}
const AV_COLOR: Record<string, string> = {
  available: '#10B981', on_service: '#3B82F6', on_leave: '#F59E0B', unavailable: '#EF4444',
}

export default function CreateJobScreen({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [step, setStep]           = useState<'equipment' | 'details'>('equipment')
  const [equipment, setEquipment] = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])
  const [search, setSearch]       = useState('')
  const [selectedEq, setSelectedEq] = useState<any>(null)
  const [selectedEng, setSelectedEng] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('preventive')
  const [priority, setPriority]   = useState<Priority>('medium')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving]       = useState(false)
  const [loadingEquip, setLoadingEquip] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: equips }, { data: engs }] = await Promise.all([
        supabase.from('equipment').select('id, serial_number, facility_name, sale_type, next_service_date, subcategory_id')
          .eq('status', 'active').order('facility_name').limit(200),
        supabase.from('profiles').select('id, name, availability_status, specializations').eq('role', 'engineer').order('name'),
      ])

      if (equips?.length) {
        const subIds = [...new Set(equips.map(e => e.subcategory_id).filter(Boolean))]
        const { data: subs } = subIds.length
          ? await supabase.from('subcategories').select('id, name').in('id', subIds)
          : { data: [] }
        setEquipment(equips.map(e => ({ ...e, subcategory: subs?.find((s: any) => s.id === e.subcategory_id) })))
      }
      setEngineers(engs ?? [])
      setLoadingEquip(false)
    }
    load()
  }, [])

  const filtered = equipment.filter(e => {
    if (!search) return true
    const s = search.toLowerCase()
    return e.facility_name?.toLowerCase().includes(s) || e.serial_number?.toLowerCase().includes(s)
  })

  const handleCreate = async () => {
    if (!selectedEq) { Alert.alert('Select equipment'); return }
    setSaving(true)
    try {
      const payload: any = {
        equipment_id: selectedEq.id,
        service_type: serviceType,
        priority,
        special_instructions: instructions || null,
        status: selectedEng ? 'scheduled' : 'pending',
        assigned_by: profile.id,
      }
      if (selectedEng) {
        payload.engineer_id    = selectedEng
        payload.scheduled_date = scheduledDate
        payload.assigned_at    = new Date().toISOString()
      }

      const { data: assignment, error } = await supabase.from('service_assignments').insert(payload).select().single()
      if (error) throw error

      if (selectedEng && assignment) {
        const eng = engineers.find(e => e.id === selectedEng)
        await supabase.from('notifications').insert({
          recipient_id: selectedEng,
          type: 'assignment',
          title: 'New Service Assignment',
          message: `You have been assigned to service ${selectedEq.facility_name} on ${scheduledDate}`,
          data: { assignment_id: assignment.id, equipment_id: selectedEq.id },
          priority: priority === 'urgent' ? 'urgent' : 'medium',
        })
      }

      Alert.alert('✅ Job Created!',
        selectedEng ? 'Engineer notified' : 'Job saved as pending — assign engineer later',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  const SVC_LABELS: Record<string, string> = {
    preventive: 'Preventive', corrective: 'Corrective',
    installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 'details' ? setStep('equipment') : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{step === 'equipment' ? 'Select Equipment' : 'Job Details'}</Text>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step === 'equipment' && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step === 'details' && styles.stepDotActive]} />
        </View>
      </View>

      {/* STEP 1: Pick equipment */}
      {step === 'equipment' && (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={colors.textDim} />
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
              placeholder="Search facility or serial…" placeholderTextColor={colors.textDim} />
            {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={colors.textDim} /></TouchableOpacity> : null}
          </View>
          {loadingEquip ? <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} /> : (
            <FlatList
              data={filtered}
              keyExtractor={e => e.id}
              contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
              renderItem={({ item: e }) => (
                <TouchableOpacity
                  style={[styles.eqCard, selectedEq?.id === e.id && styles.eqCardSelected]}
                  onPress={() => { setSelectedEq(e); setStep('details') }}
                >
                  <View style={[styles.eqAccent, { backgroundColor: SALE_COLORS[e.sale_type] ?? colors.purple }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eqFacility} numberOfLines={1}>{e.facility_name}</Text>
                    <Text style={styles.eqModel}>{e.subcategory?.name ?? '—'} · S/N: {e.serial_number}</Text>
                    {e.next_service_date && (
                      <Text style={styles.eqDate}>Due: {new Date(e.next_service_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </TouchableOpacity>
              )}
            />
          )}
        </>
      )}

      {/* STEP 2: Job details */}
      {step === 'details' && selectedEq && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Selected equipment summary */}
          <View style={[styles.selectedEqCard, { borderLeftColor: SALE_COLORS[selectedEq.sale_type] ?? colors.purple }]}>
            <Text style={styles.selectedEqName}>{selectedEq.facility_name}</Text>
            <Text style={styles.selectedEqModel}>{selectedEq.subcategory?.name} · {selectedEq.serial_number}</Text>
            <TouchableOpacity onPress={() => setStep('equipment')} style={{ marginTop: 6 }}>
              <Text style={{ color: colors.cyan, fontSize: 12 }}>Change equipment →</Text>
            </TouchableOpacity>
          </View>

          {/* Service type */}
          <Text style={styles.sectionLabel}>Service Type</Text>
          <View style={styles.chipWrap}>
            {(Object.keys(SVC_LABELS) as ServiceType[]).map(t => (
              <TouchableOpacity key={t} style={[styles.chip, serviceType === t && styles.chipActive]}
                onPress={() => setServiceType(t)}>
                <Text style={[styles.chipText, serviceType === t && styles.chipTextActive]}>{SVC_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={styles.sectionLabel}>Priority</Text>
          <View style={styles.chipWrap}>
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => {
              const pColor = p === 'urgent' ? '#EF4444' : p === 'high' ? '#F97316' : p === 'medium' ? '#3B82F6' : colors.textDim
              return (
                <TouchableOpacity key={p} style={[styles.chip, priority === p && { borderColor: pColor, backgroundColor: `${pColor}20` }]}
                  onPress={() => setPriority(p)}>
                  <Text style={[styles.chipText, priority === p && { color: pColor }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Date */}
          <Text style={styles.sectionLabel}>Scheduled Date</Text>
          <TextInput style={styles.inp} value={scheduledDate} onChangeText={setScheduledDate} placeholder="YYYY-MM-DD" placeholderTextColor="#475569" />

          {/* Instructions */}
          <Text style={styles.sectionLabel}>Special Instructions (optional)</Text>
          <TextInput style={[styles.inp, { height: 70, textAlignVertical: 'top' }]} value={instructions}
            onChangeText={setInstructions} placeholder="Any notes for the engineer…" placeholderTextColor="#475569" multiline />

          {/* Assign engineer (optional) */}
          <Text style={styles.sectionLabel}>Assign Engineer (optional)</Text>
          <Text style={styles.sectionHint}>Leave unselected to assign later from the Assignments screen</Text>

          <TouchableOpacity style={[styles.chip, !selectedEng && { borderColor: colors.purple, backgroundColor: `${colors.purple}15` }]}
            onPress={() => setSelectedEng('')}>
            <Text style={[styles.chipText, !selectedEng && { color: colors.purpleLight }]}>— Assign Later —</Text>
          </TouchableOpacity>

          {engineers.map(eng => (
            <TouchableOpacity key={eng.id}
              style={[styles.engRow, selectedEng === eng.id && { borderColor: colors.cyan, backgroundColor: `${colors.cyan}10` }]}
              onPress={() => setSelectedEng(eng.id)}>
              <View style={styles.engAvatar}><Text style={styles.engAvatarText}>{eng.name.charAt(0)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.engName}>{eng.name}</Text>
                <Text style={styles.engSpec}>{eng.specializations?.join(', ') || 'General'}</Text>
              </View>
              <View style={{ backgroundColor: `${AV_COLOR[eng.availability_status]}22`, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: AV_COLOR[eng.availability_status], fontSize: 10, fontWeight: '700' }}>
                  {eng.availability_status === 'available' ? 'Available' : eng.availability_status === 'on_service' ? 'On Call' : eng.availability_status === 'on_leave' ? 'Leave' : 'Unavailable'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={[styles.createJobBtn, saving && { opacity: 0.6 }]} onPress={handleCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.createJobBtnText}>{selectedEng ? 'Create & Assign' : 'Create Job (Assign Later)'}</Text>
                </>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title:          { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  stepIndicator:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.cardBorder },
  stepDotActive:  { backgroundColor: colors.purple },
  stepLine:       { width: 16, height: 2, backgroundColor: colors.cardBorder },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.cardBorder },
  searchInput:    { flex: 1, color: colors.text, fontSize: 14 },
  eqCard:         { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.cardBorder },
  eqCardSelected: { borderColor: colors.cyan, backgroundColor: `${colors.cyan}10` },
  eqAccent:       { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  eqFacility:     { fontSize: 14, fontWeight: '700', color: colors.text },
  eqModel:        { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  eqDate:         { fontSize: 11, color: colors.textDim, marginTop: 1 },
  selectedEqCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, borderLeftWidth: 3, marginBottom: 16 },
  selectedEqName: { fontSize: 15, fontWeight: '700', color: colors.text },
  selectedEqModel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 16 },
  sectionHint:    { fontSize: 11, color: colors.textDim, marginTop: -4, marginBottom: 8 },
  chipWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder },
  chipActive:     { backgroundColor: `${colors.purple}25`, borderColor: colors.purple },
  chipText:       { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.purpleLight },
  inp:            { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  engRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 8, marginTop: 6 },
  engAvatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.purple}33`, alignItems: 'center', justifyContent: 'center' },
  engAvatarText:  { fontSize: 15, fontWeight: '800', color: colors.purpleLight },
  engName:        { fontSize: 14, fontWeight: '600', color: colors.text },
  engSpec:        { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  createJobBtn:   { backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 },
  createJobBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
