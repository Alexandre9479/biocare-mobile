import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

// Manual quick-add form for single machine entry on mobile
export default function ImportEquipmentScreen({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [tab, setTab] = useState<'excel' | 'manual'>('excel')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Import Equipment</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'excel' && styles.tabActive]} onPress={() => setTab('excel')}>
          <Text style={[styles.tabText, tab === 'excel' && styles.tabTextActive]}>📊 Excel Import</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'manual' && styles.tabActive]} onPress={() => setTab('manual')}>
          <Text style={[styles.tabText, tab === 'manual' && styles.tabTextActive]}>✍️ Quick Add</Text>
        </TouchableOpacity>
      </View>

      {tab === 'excel' ? <ExcelTab /> : <QuickAddTab navigation={navigation} profile={profile} />}
    </SafeAreaView>
  )
}

function ExcelTab() {
  const webUrl = 'https://biocare-service-management.vercel.app/equipment/import'

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.logoWrap}>
        <Image source={require('../../../assets/biocare-logo.png')} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="document-text-outline" size={32} color={colors.cyan} style={{ alignSelf: 'center', marginBottom: 12 }} />
        <Text style={styles.infoTitle}>Import from Excel (Web)</Text>
        <Text style={styles.infoText}>
          Bulk import from the Biocare Excel template is available on the web app. The template supports all 21 equipment models across multiple sheets.
        </Text>
      </View>

      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>How to import</Text>
        {[
          { num: '1', text: 'Open the web app on your laptop or tap the button below' },
          { num: '2', text: 'Go to Equipment → Import Excel' },
          { num: '3', text: 'Upload your Biocare template (.xlsx)' },
          { num: '4', text: 'Preview the data, then click Import' },
          { num: '5', text: 'All machines appear immediately in this mobile app too' },
        ].map(s => (
          <View key={s.num} style={styles.step}>
            <View style={styles.stepBubble}><Text style={styles.stepBubbleText}>{s.num}</Text></View>
            <Text style={styles.stepText}>{s.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.openWebBtn} onPress={() => Linking.openURL(webUrl)}>
        <Ionicons name="open-outline" size={18} color="#fff" />
        <Text style={styles.openWebBtnText}>Open Web App Import</Text>
      </TouchableOpacity>

      <Text style={styles.urlText}>{webUrl}</Text>

      <View style={styles.templateCard}>
        <Ionicons name="information-circle-outline" size={16} color={colors.cyan} />
        <Text style={styles.templateText}>
          Template: Each sheet = equipment model (DYMIND DH36, FINECARE FS113, etc){'\n'}
          Columns: FACILITY · EMAIL · PHONE NO. · CONTACT PERSON · S/N · STATUS · MODE OF AQUISITION
        </Text>
      </View>
    </ScrollView>
  )
}

function QuickAddTab({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [entries, setEntries] = useState([{ facility: '', phone: '', sn: '', sale_type: 'cash' }])
  const [saving, setSaving] = useState(false)

  const addRow = () => setEntries(e => [...e, { facility: '', phone: '', sn: '', sale_type: 'cash' }])
  const removeRow = (i: number) => setEntries(e => e.filter((_, idx) => idx !== i))
  const updateRow = (i: number, key: string, val: string) =>
    setEntries(e => e.map((row, idx) => idx === i ? { ...row, [key]: val } : row))

  const handleSave = async () => {
    const valid = entries.filter(e => e.facility.trim())
    if (!valid.length) { Alert.alert('Required', 'Enter at least one facility name'); return }
    setSaving(true)
    let success = 0
    for (const e of valid) {
      const { error } = await supabase.from('equipment').insert({
        serial_number: e.sn.trim() || `MOBILE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        facility_name: e.facility.trim(),
        facility_contact_phone: e.phone || null,
        sale_type: e.sale_type,
        status: 'active',
        service_interval_days: 90,
        created_by: profile.id,
      })
      if (!error) success++
    }
    setSaving(false)
    Alert.alert('✅ Done', `${success} of ${valid.length} equipment added!`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ])
  }

  const SALE_OPTS = [
    { val: 'cash', label: 'Cash', color: '#10B981' },
    { val: 'placement', label: 'Placement', color: '#F97316' },
    { val: 'hire_purchase', label: 'HP', color: '#3B82F6' },
  ]

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.quickTitle}>Quick-add multiple machines</Text>
      <Text style={styles.quickSub}>Fill in the basics — you can edit full details later from Equipment screen</Text>

      {entries.map((entry, i) => (
        <View key={i} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryNum}>#{i + 1}</Text>
            {entries.length > 1 && (
              <TouchableOpacity onPress={() => removeRow(i)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput style={styles.inp} value={entry.facility} onChangeText={v => updateRow(i, 'facility', v)}
            placeholder="Facility name *" placeholderTextColor="#475569" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.inp, { flex: 1 }]} value={entry.sn} onChangeText={v => updateRow(i, 'sn', v)}
              placeholder="Serial No. (optional)" placeholderTextColor="#475569" />
            <TextInput style={[styles.inp, { flex: 1 }]} value={entry.phone} onChangeText={v => updateRow(i, 'phone', v)}
              placeholder="+254..." placeholderTextColor="#475569" keyboardType="phone-pad" />
          </View>
          <View style={styles.saleRow}>
            {SALE_OPTS.map(o => (
              <TouchableOpacity key={o.val}
                style={[styles.saleChip, entry.sale_type === o.val && { borderColor: o.color, backgroundColor: `${o.color}22` }]}
                onPress={() => updateRow(i, 'sale_type', o.val)}>
                <View style={[styles.saleDot, { backgroundColor: o.color }]} />
                <Text style={[styles.saleChipText, entry.sale_type === o.val && { color: o.color }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addRowBtn} onPress={addRow}>
        <Ionicons name="add-circle-outline" size={20} color={colors.cyan} />
        <Text style={styles.addRowText}>Add another machine</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.saveAllBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveAllText}>Save {entries.filter(e => e.facility.trim()).length || 0} Equipment</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn:     { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '800', color: colors.text },
  tabs:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  tab:         { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  tabActive:   { backgroundColor: colors.purple, borderColor: colors.purple },
  tabText:     { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  content:     { padding: 16, paddingBottom: 40 },
  logoWrap:    { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 16 },
  logo:        { width: '100%', height: 50 },
  infoCard:    { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  infoTitle:   { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  infoText:    { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  stepCard:    { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 14 },
  stepTitle:   { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  step:        { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  stepBubble:  { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepBubbleText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepText:    { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  openWebBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 16, marginBottom: 8 },
  openWebBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  urlText:     { fontSize: 11, color: colors.textDim, textAlign: 'center', marginBottom: 16 },
  templateCard: { flexDirection: 'row', gap: 10, backgroundColor: `${colors.cyan}15`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${colors.cyan}30` },
  templateText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 18 },
  quickTitle:  { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  quickSub:    { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  entryCard:   { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  entryNum:    { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  inp:         { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13, marginBottom: 8 },
  saleRow:     { flexDirection: 'row', gap: 8 },
  saleChip:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: '#0F172A' },
  saleDot:     { width: 6, height: 6, borderRadius: 3 },
  saleChipText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  addRowBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: `${colors.cyan}50`, marginBottom: 14 },
  addRowText:  { color: colors.cyan, fontWeight: '600', fontSize: 14 },
  saveAllBtn:  { backgroundColor: colors.purple, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveAllText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
