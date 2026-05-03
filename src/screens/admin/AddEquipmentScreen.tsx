import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile, SaleType, EquipmentStatus } from '../../types'

const SALE_TYPES: { value: SaleType; label: string; desc: string; color: string }[] = [
  { value: 'cash',          label: 'Cash Sale',     desc: 'Customer pays for service',   color: '#10B981' },
  { value: 'placement',     label: 'Placement',     desc: 'Free servicing by Biocare',   color: '#F97316' },
  { value: 'hire_purchase', label: 'Hire Purchase', desc: 'Conditional free service',    color: '#3B82F6' },
]

export default function AddEquipmentScreen({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [categories, setCategories]   = useState<any[]>([])
  const [subcategories, setSubs]      = useState<any[]>([])
  const [regions, setRegions]         = useState<any[]>([])
  const [saving, setSaving]           = useState(false)

  // Form state
  const [form, setForm] = useState({
    serial_number: '', facility_name: '', facility_contact_name: '',
    facility_contact_phone: '', facility_contact_email: '', facility_address: '',
    category_id: '', subcategory_id: '', region_id: '', county: '',
    installation_date: '', service_interval_days: '90',
    sale_type: 'cash' as SaleType, status: 'active' as EquipmentStatus,
    warranty_expiry_date: '', notes: '',
    hp_total_price: '', hp_down_payment: '', hp_installment_amount: '',
    hp_installment_frequency: 'monthly', hp_total_installments: '', hp_installments_paid: '0',
    hp_payment_status: 'active',
  })

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
      supabase.from('regions').select('id, name').eq('is_active', true).order('name'),
    ]).then(([{ data: cats }, { data: regs }]) => {
      setCategories(cats ?? [])
      setRegions(regs ?? [])
    })
  }, [])

  useEffect(() => {
    if (!form.category_id) { setSubs([]); return }
    supabase.from('subcategories').select('id, name').eq('category_id', form.category_id).eq('is_active', true).order('name')
      .then(({ data }) => setSubs(data ?? []))
  }, [form.category_id])

  const handleSave = async () => {
    if (!form.serial_number.trim()) { Alert.alert('Required', 'Enter a serial number'); return }
    if (!form.facility_name.trim()) { Alert.alert('Required', 'Enter a facility name'); return }

    setSaving(true)
    try {
      const payload: any = {
        serial_number: form.serial_number.trim(),
        facility_name: form.facility_name.trim(),
        facility_contact_name: form.facility_contact_name || null,
        facility_contact_phone: form.facility_contact_phone || null,
        facility_contact_email: form.facility_contact_email || null,
        facility_address: form.facility_address || null,
        category_id: form.category_id || null,
        subcategory_id: form.subcategory_id || null,
        region_id: form.region_id || null,
        county: form.county || null,
        installation_date: form.installation_date || null,
        service_interval_days: parseInt(form.service_interval_days) || 90,
        sale_type: form.sale_type,
        status: form.status,
        warranty_expiry_date: form.warranty_expiry_date || null,
        notes: form.notes || null,
        created_by: profile.id,
      }

      // Calculate next service date
      if (form.installation_date) {
        const d = new Date(form.installation_date)
        d.setDate(d.getDate() + (parseInt(form.service_interval_days) || 90))
        payload.next_service_date = d.toISOString().split('T')[0]
      }

      if (form.sale_type === 'hire_purchase') {
        payload.hp_total_price        = parseFloat(form.hp_total_price) || null
        payload.hp_down_payment       = parseFloat(form.hp_down_payment) || null
        payload.hp_installment_amount = parseFloat(form.hp_installment_amount) || null
        payload.hp_installment_frequency = form.hp_installment_frequency
        payload.hp_total_installments = parseInt(form.hp_total_installments) || null
        payload.hp_installments_paid  = parseInt(form.hp_installments_paid) || 0
        payload.hp_payment_status     = form.hp_payment_status
      }

      const { error } = await supabase.from('equipment').insert(payload)
      if (error) throw error

      Alert.alert('✅ Success', 'Equipment added!', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )

  const input = (key: string, placeholder: string, opts?: any) => (
    <TextInput style={styles.input} value={(form as any)[key]} onChangeText={v => set(key, v)}
      placeholder={placeholder} placeholderTextColor="#475569"
      keyboardType={opts?.numeric ? 'decimal-pad' : 'default'} {...opts} />
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Equipment</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Basic */}
        <SectionHeader title="Basic Information" />
        <Field label="Serial Number *">{input('serial_number', 'SN-001234')}</Field>

        <Field label="Category">
          <View style={styles.pickerWrap}>
            {categories.map(c => (
              <TouchableOpacity key={c.id} style={[styles.pickerChip, form.category_id === c.id && styles.pickerChipActive]}
                onPress={() => { set('category_id', c.id); set('subcategory_id', '') }}>
                <Text style={[styles.pickerChipText, form.category_id === c.id && styles.pickerChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {subcategories.length > 0 && (
          <Field label="Model">
            <View style={styles.pickerWrap}>
              {subcategories.map(s => (
                <TouchableOpacity key={s.id} style={[styles.pickerChip, form.subcategory_id === s.id && styles.pickerChipActive]}
                  onPress={() => set('subcategory_id', s.id)}>
                  <Text style={[styles.pickerChipText, form.subcategory_id === s.id && styles.pickerChipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>
        )}

        {/* Facility */}
        <SectionHeader title="Facility Information" />
        <Field label="Facility Name *">{input('facility_name', 'General Hospital Nairobi')}</Field>
        <Field label="Contact Person">{input('facility_contact_name', 'Dr. Jane Doe')}</Field>
        <Field label="Phone">{input('facility_contact_phone', '+254 700 000 000', { keyboardType: 'phone-pad' })}</Field>
        <Field label="Email">{input('facility_contact_email', 'hospital@email.com', { keyboardType: 'email-address', autoCapitalize: 'none' })}</Field>

        <Field label="Region">
          <View style={styles.pickerWrap}>
            {regions.map(r => (
              <TouchableOpacity key={r.id} style={[styles.pickerChip, form.region_id === r.id && styles.pickerChipActive]}
                onPress={() => set('region_id', r.id)}>
                <Text style={[styles.pickerChipText, form.region_id === r.id && styles.pickerChipTextActive]}>{r.name.replace(' Region', '')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="County / Town">{input('county', 'e.g. Nakuru, Westlands')}</Field>
        <Field label="Address">{input('facility_address', 'Street address')}</Field>

        {/* Service */}
        <SectionHeader title="Service Schedule" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Installation Date">{input('installation_date', 'YYYY-MM-DD')}</Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Interval (days)">{input('service_interval_days', '90', { numeric: true })}</Field>
          </View>
        </View>
        <Field label="Warranty Expiry">{input('warranty_expiry_date', 'YYYY-MM-DD')}</Field>

        {/* Sale type */}
        <SectionHeader title="Sale Type" />
        <View style={styles.saleGrid}>
          {SALE_TYPES.map(st => (
            <TouchableOpacity key={st.value} style={[styles.saleCard, form.sale_type === st.value && { borderColor: st.color, backgroundColor: `${st.color}15` }]}
              onPress={() => set('sale_type', st.value)}>
              <View style={[styles.saleCircle, { backgroundColor: st.color }]} />
              <Text style={[styles.saleLabel, form.sale_type === st.value && { color: st.color }]}>{st.label}</Text>
              <Text style={styles.saleDesc}>{st.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* HP details */}
        {form.sale_type === 'hire_purchase' && (
          <>
            <SectionHeader title="Hire Purchase Details" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Total Price (KES)">{input('hp_total_price', '0', { numeric: true })}</Field></View>
              <View style={{ flex: 1 }}><Field label="Down Payment">{input('hp_down_payment', '0', { numeric: true })}</Field></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Installment (KES)">{input('hp_installment_amount', '0', { numeric: true })}</Field></View>
              <View style={{ flex: 1 }}><Field label="Total Installments">{input('hp_total_installments', '12', { numeric: true })}</Field></View>
            </View>
            <Field label="HP Status">
              <View style={styles.pickerWrap}>
                {['active', 'completed', 'defaulted'].map(s => (
                  <TouchableOpacity key={s} style={[styles.pickerChip, form.hp_payment_status === s && styles.pickerChipActive]}
                    onPress={() => set('hp_payment_status', s)}>
                    <Text style={[styles.pickerChipText, form.hp_payment_status === s && styles.pickerChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          </>
        )}

        {/* Notes */}
        <SectionHeader title="Additional" />
        <Field label="Notes">
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.notes} onChangeText={v => set('notes', v)}
            placeholder="Any additional notes..." placeholderTextColor="#475569" multiline />
        </Field>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  backBtn:    { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  saveBtn:    { backgroundColor: colors.purple, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  content:    { padding: 16 },
  sectionHeader: { marginTop: 16, marginBottom: 10 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  field:      { marginBottom: 12 },
  label:      { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input:      { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  pickerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  pickerChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  pickerChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  pickerChipTextActive: { color: '#fff' },
  saleGrid:   { gap: 10 },
  saleCard:   { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 12 },
  saleCircle: { width: 12, height: 12, borderRadius: 6 },
  saleLabel:  { fontSize: 14, fontWeight: '700', color: colors.textMuted, flex: 1 },
  saleDesc:   { fontSize: 10, color: colors.textDim },
})
