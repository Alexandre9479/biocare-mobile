import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator, Platform
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { colors } from '../theme'

const SERVICE_TYPES = ['preventive', 'corrective', 'installation', 'calibration', 'emergency']
const SERVICE_LABELS: Record<string, string> = {
  preventive: 'Preventive', corrective: 'Corrective',
  installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
}

function chargeStatus(saleType: string, hpStatus?: string): { label: string; free: boolean } {
  if (saleType === 'placement') return { label: 'FREE SERVICE (Placement Contract)', free: true }
  if (saleType === 'hire_purchase' && hpStatus !== 'completed') return { label: 'FREE SERVICE (Under Hire Purchase)', free: true }
  return { label: 'CHARGEABLE SERVICE', free: false }
}

export default function LogServiceScreen({ route, navigation }: any) {
  const { assignment: a } = route.params
  const eq = a.equipment

  const charge = chargeStatus(eq?.sale_type ?? 'cash', eq?.hp_payment_status)

  const [serviceType, setServiceType] = useState(a.service_type ?? 'preventive')
  const [findings,    setFindings]    = useState('')
  const [actions,     setActions]     = useState('')
  const [clientName,  setClientName]  = useState(eq?.facility_contact_name ?? '')
  const [feedback,    setFeedback]    = useState('')
  const [nextDate,    setNextDate]    = useState('')
  const [hours,       setHours]       = useState('')
  const [photos,      setPhotos]      = useState<{ uri: string; type: string }[]>([])
  const [saving,      setSaving]      = useState(false)

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to upload service images.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    })
    if (!result.canceled) {
      setPhotos(p => [...p, ...result.assets.map(a => ({ uri: a.uri, type: 'other' }))])
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to take service photos.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!result.canceled) {
      setPhotos(p => [...p, { uri: result.assets[0].uri, type: 'other' }])
    }
  }

  const removePhoto = (idx: number) => setPhotos(p => p.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!findings.trim()) { Alert.alert('Required', 'Please enter service findings.'); return }

    setSaving(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // 1. Insert service log
      const { data: log, error: logErr } = await supabase
        .from('service_logs')
        .insert({
          assignment_id: a.id,
          equipment_id: eq.id,
          engineer_id: user.id,
          service_date: new Date().toISOString().split('T')[0],
          service_type: serviceType,
          findings,
          actions_taken: actions,
          service_duration_hours: hours ? parseFloat(hours) : null,
          next_recommended_date: nextDate || null,
          client_name: clientName,
          client_feedback: feedback,
          service_charge: 0,
          parts_charge: 0,
          total_charge: 0,
          charge_status: charge.label,
          payment_status: charge.free ? 'waived' : 'pending',
        })
        .select()
        .single()
      if (logErr) throw logErr

      // 2. Upload photos
      for (const photo of photos) {
        const fileName = `${user.id}/${log.id}/${Date.now()}.jpg`
        const blob = await (await fetch(photo.uri)).blob()
        const { data: uploaded, error: upErr } = await supabase.storage
          .from('service-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' })
        if (!upErr && uploaded) {
          const { data: { publicUrl } } = supabase.storage.from('service-images').getPublicUrl(fileName)
          await supabase.from('service_images').insert({
            service_log_id: log.id,
            image_url: publicUrl,
            image_type: photo.type,
            file_name: fileName,
          })
        }
      }

      Alert.alert('Success! ✅', 'Service log submitted successfully.', [
        { text: 'OK', onPress: () => navigation.popToTop() }
      ])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Equipment summary */}
      <View style={styles.equipCard}>
        <Text style={styles.facilityName} numberOfLines={1}>{eq?.facility_name}</Text>
        <Text style={styles.model}>{eq?.subcategory?.name} • S/N: {eq?.serial_number}</Text>
      </View>

      {/* Charge status */}
      <View style={[styles.chargeCard, { borderColor: charge.free ? '#065F46' : '#78350F' }]}>
        <Ionicons name={charge.free ? 'checkmark-circle' : 'receipt'} size={18} color={charge.free ? '#34D399' : '#FBBF24'} />
        <Text style={{ color: charge.free ? '#34D399' : '#FBBF24', fontWeight: '700', fontSize: 13, flex: 1 }}>
          {charge.label}
        </Text>
      </View>

      {/* Service type selector */}
      <Section title="Service Type">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SERVICE_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setServiceType(t)}
              style={[styles.typeChip, serviceType === t && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, serviceType === t && styles.typeChipTextActive]}>
                {SERVICE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Findings */}
      <Section title="Findings *">
        <TextInput style={[styles.input, styles.textArea]} value={findings} onChangeText={setFindings}
          placeholder="What was found during inspection..." placeholderTextColor="#475569"
          multiline numberOfLines={4} textAlignVertical="top" />
      </Section>

      {/* Actions */}
      <Section title="Actions Taken">
        <TextInput style={[styles.input, styles.textArea]} value={actions} onChangeText={setActions}
          placeholder="What was done to resolve issues..." placeholderTextColor="#475569"
          multiline numberOfLines={4} textAlignVertical="top" />
      </Section>

      {/* Duration & Next Date */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Duration (hours)</Text>
          <TextInput style={styles.input} value={hours} onChangeText={setHours}
            placeholder="e.g. 2.5" placeholderTextColor="#475569" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Next Service Date</Text>
          <TextInput style={styles.input} value={nextDate} onChangeText={setNextDate}
            placeholder="YYYY-MM-DD" placeholderTextColor="#475569" />
        </View>
      </View>

      {/* Photos */}
      <Section title="Service Photos">
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.photoBtn, { flex: 1 }]} onPress={takePhoto}>
            <Ionicons name="camera" size={18} color={colors.cyan} />
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { flex: 1 }]} onPress={pickImage}>
            <Ionicons name="images" size={18} color={colors.cyan} />
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Client */}
      <Section title="Client Information">
        <Text style={styles.label}>Client Name</Text>
        <TextInput style={[styles.input, { marginBottom: 10 }]} value={clientName} onChangeText={setClientName}
          placeholder="Contact person name" placeholderTextColor="#475569" />
        <Text style={styles.label}>Client Feedback</Text>
        <TextInput style={[styles.input, styles.textArea]} value={feedback} onChangeText={setFeedback}
          placeholder="Any comments from the client..." placeholderTextColor="#475569"
          multiline numberOfLines={3} textAlignVertical="top" />
      </Section>

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.submitText}>Submit Service Log</Text>
            </>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  equipCard:       { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 10 },
  facilityName:    { fontSize: 16, fontWeight: '700', color: colors.text },
  model:           { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chargeCard:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0F172A', borderRadius: 10, padding: 12, borderWidth: 1.5, marginBottom: 16 },
  label:           { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input:           { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  textArea:        { height: 100, textAlignVertical: 'top' },
  typeChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  typeChipActive:  { backgroundColor: '#7B2D8B', borderColor: '#7B2D8B' },
  typeChipText:    { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  photoBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingVertical: 12 },
  photoBtnText:    { color: colors.cyan, fontWeight: '600', fontSize: 13 },
  photoThumb:      { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  removePhoto:     { position: 'absolute', top: 2, right: 2 },
  submitBtn:       { backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
  submitText:      { color: '#fff', fontSize: 17, fontWeight: '700' },
})
