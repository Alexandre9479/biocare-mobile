import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, ScrollView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

export default function AdminAssignmentsScreen({ profile, navigation }: { profile: Profile; navigation: any }) {
  const [jobs, setJobs]         = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal]       = useState<any>(null)   // the assignment being assigned
  const [selectedEng, setSelectedEng] = useState('')
  const [schedDate, setSchedDate]     = useState(new Date().toISOString().split('T')[0])
  const [assigning, setAssigning]     = useState(false)

  const load = async () => {
    try {
      // Pending assignments + unassigned due equipment
      const threshold = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [{ data: assigns }, { data: dueEquip }] = await Promise.all([
        supabase.from('service_assignments').select('id, equipment_id, priority, status, created_at')
          .eq('status', 'pending').order('created_at').limit(30),
        supabase.from('equipment')
          .select('id, serial_number, facility_name, sale_type, next_service_date, subcategory_id, region_id')
          .lte('next_service_date', threshold).eq('status', 'active').order('next_service_date').limit(20),
      ])

      // Remove due equipment that already has an active assignment
      const assignedIds = new Set((assigns ?? []).map(a => a.equipment_id))
      const unassigned = (dueEquip ?? []).filter(e => !assignedIds.has(e.id))

      const allEquipIds = [
        ...(assigns ?? []).map(a => a.equipment_id),
        ...unassigned.map(e => e.id),
      ].filter(Boolean)

      const [{ data: equips }, { data: subs }] = await Promise.all([
        allEquipIds.length ? supabase.from('equipment').select('id, serial_number, facility_name, sale_type, next_service_date, subcategory_id').in('id', allEquipIds) : { data: [] },
        supabase.from('subcategories').select('id, name'),
      ])

      const enrich = (equipId: string) => {
        const eq = equips?.find(e => e.id === equipId)
        return eq ? { ...eq, subcategory: subs?.find(s => s.id === eq.subcategory_id) } : null
      }

      const pendingList = (assigns ?? []).map(a => ({
        id: a.id,
        equipment_id: a.equipment_id,
        priority: a.priority,
        isExisting: true,
        equipment: enrich(a.equipment_id),
      }))

      const dueList = unassigned.map(e => ({
        id: `due-${e.id}`,
        equipment_id: e.id,
        priority: 'medium',
        isExisting: false,
        equipment: { ...e, subcategory: subs?.find(s => s.id === e.subcategory_id) },
      }))

      setJobs([...pendingList, ...dueList])

      const { data: engs } = await supabase.from('profiles')
        .select('id, name, availability_status, specializations').eq('role', 'engineer').order('name')
      setEngineers(engs ?? [])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAssign = (job: any) => {
    setModal(job)
    setSelectedEng('')
    setSchedDate(new Date().toISOString().split('T')[0])
  }

  const handleAssign = async () => {
    if (!selectedEng) { Alert.alert('Select an engineer first'); return }
    setAssigning(true)
    try {
      let assignmentId = modal.isExisting ? modal.id : null

      if (!modal.isExisting) {
        const { data: newA, error } = await supabase.from('service_assignments')
          .insert({ equipment_id: modal.equipment_id, status: 'pending', priority: modal.priority })
          .select().single()
        if (error) throw error
        assignmentId = newA.id
      }

      const { error: updateErr } = await supabase.from('service_assignments')
        .update({
          engineer_id: selectedEng,
          scheduled_date: schedDate,
          status: 'scheduled',
          assigned_by: profile.id,
          assigned_at: new Date().toISOString(),
          service_type: 'preventive',
        })
        .eq('id', assignmentId)
      if (updateErr) throw updateErr

      const eng = engineers.find(e => e.id === selectedEng)
      await supabase.from('notifications').insert({
        recipient_id: selectedEng,
        type: 'assignment',
        title: 'New Service Assignment',
        message: `You have been assigned to service ${modal.equipment?.facility_name} on ${schedDate}`,
        data: { assignment_id: assignmentId, equipment_id: modal.equipment_id },
        priority: 'medium',
      })

      Alert.alert('✅ Assigned!', `${eng?.name} assigned to ${modal.equipment?.facility_name}`)
      setModal(null)
      load()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setAssigning(false)
    }
  }

  const days = (date?: string) => date
    ? Math.round((new Date(date).getTime() - Date.now()) / 86400000)
    : null

  const avColors: Record<string, string> = {
    available: '#10B981', on_service: '#3B82F6', on_leave: '#F59E0B', unavailable: '#EF4444'
  }
  const avLabels: Record<string, string> = {
    available: 'Available', on_service: 'On Call', on_leave: 'On Leave', unavailable: 'Unavailable'
  }

  const renderJob = ({ item: job }: { item: any }) => {
    const d = days(job.equipment?.next_service_date)
    const isOverdue = d !== null && d < 0
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.facility} numberOfLines={1}>{job.equipment?.facility_name ?? '—'}</Text>
            <Text style={styles.model}>{job.equipment?.subcategory?.name} • S/N: {job.equipment?.serial_number}</Text>
            {d !== null && (
              <Text style={{ color: isOverdue ? '#FCA5A5' : '#FDE68A', fontSize: 12, marginTop: 4 }}>
                {isOverdue ? `${Math.abs(d)}d overdue` : `Due in ${d}d`}
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.assignBtn} onPress={() => openAssign(job)}>
            <Ionicons name="person-add-outline" size={14} color="#fff" />
            <Text style={styles.assignBtnText}>Assign</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Assignments</Text>
            <Text style={styles.pageSubtitle}>{jobs.length} pending · need engineer</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateJob')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Job</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={j => j.id}
            renderItem={renderJob}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.emerald} />
                <Text style={styles.emptyText}>All services assigned!</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Assign Modal */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Engineer</Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {modal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.equipSummary}>
                  <Text style={styles.equipName}>{modal.equipment?.facility_name}</Text>
                  <Text style={styles.equipModel}>{modal.equipment?.subcategory?.name}</Text>
                </View>

                <Text style={styles.fieldLabel}>Service Date</Text>
                <TextInput
                  style={styles.dateInput}
                  value={schedDate}
                  onChangeText={setSchedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#475569"
                />

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Select Engineer</Text>
                {engineers.map(eng => (
                  <TouchableOpacity
                    key={eng.id}
                    style={[styles.engRow, selectedEng === eng.id && styles.engRowSelected]}
                    onPress={() => setSelectedEng(eng.id)}
                  >
                    <View style={styles.engAvatar}>
                      <Text style={styles.engAvatarText}>{eng.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.engName}>{eng.name}</Text>
                      <Text style={styles.engSpec}>{eng.specializations?.join(', ') || 'General'}</Text>
                    </View>
                    <View style={{ backgroundColor: `${avColors[eng.availability_status]}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                      <Text style={{ color: avColors[eng.availability_status], fontSize: 10, fontWeight: '700' }}>
                        {avLabels[eng.availability_status]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.confirmBtn, (!selectedEng || assigning) && { opacity: 0.5 }]}
                  onPress={handleAssign}
                  disabled={!selectedEng || assigning}
                >
                  {assigning
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.confirmText}>Confirm Assignment</Text>}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  container:       { flex: 1 },
  titleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  pageTitle:       { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSubtitle:    { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  createBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.purple, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  createBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  card:            { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  facility:        { fontSize: 15, fontWeight: '700', color: colors.text },
  model:           { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  assignBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.purple, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  assignBtnText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyText:       { color: colors.textMuted, fontSize: 15 },
  // Modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:      { fontSize: 17, fontWeight: '800', color: colors.text },
  equipSummary:    { backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginBottom: 16 },
  equipName:       { fontSize: 15, fontWeight: '700', color: colors.text },
  equipModel:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fieldLabel:      { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  dateInput:       { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  engRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 8 },
  engRowSelected:  { borderColor: colors.cyan, backgroundColor: `${colors.cyan}15` },
  engAvatar:       { width: 38, height: 38, borderRadius: 19, backgroundColor: `${colors.purple}33`, alignItems: 'center', justifyContent: 'center' },
  engAvatarText:   { color: colors.purpleLight, fontWeight: '800', fontSize: 15 },
  engName:         { color: colors.text, fontWeight: '600', fontSize: 14 },
  engSpec:         { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  confirmBtn:      { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  confirmText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
})
