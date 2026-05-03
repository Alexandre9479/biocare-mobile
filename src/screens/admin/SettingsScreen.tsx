import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

export default function SettingsScreen({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<'whatsapp' | 'rates'>('whatsapp')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>
      <View style={styles.tabs}>
        {(['whatsapp', 'rates'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'whatsapp' ? '💬 WhatsApp API' : '💰 Service Rates'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'whatsapp' ? <WhatsAppTab profile={profile} /> : <RatesTab />}
    </SafeAreaView>
  )
}

function WhatsAppTab({ profile }: { profile: Profile }) {
  const [phoneId, setPhoneId] = useState('')
  const [token,   setToken]   = useState('')
  const [enabled, setEnabled] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading]  = useState(true)
  const [saving, setSaving]    = useState(false)
  const [testing, setTesting]  = useState(false)
  const [testPhone, setTestPhone] = useState('')

  useEffect(() => {
    supabase.from('system_settings')
      .select('key, value')
      .in('key', ['whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_enabled'])
      .then(({ data }) => {
        const map: Record<string, string> = {}
        data?.forEach(r => { map[r.key] = r.value ?? '' })
        setPhoneId(map.whatsapp_phone_number_id ?? '')
        setToken(map.whatsapp_access_token ?? '')
        setEnabled(map.whatsapp_enabled === 'true')
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    const updates = [
      { key: 'whatsapp_phone_number_id', value: phoneId },
      { key: 'whatsapp_access_token', value: token },
      { key: 'whatsapp_enabled', value: String(enabled) },
    ]
    for (const u of updates) {
      await supabase.from('system_settings').update({ value: u.value, updated_by: profile.id }).eq('key', u.key)
    }
    setSaving(false)
    Alert.alert('✅ Saved', 'WhatsApp settings updated')
  }

  const testSend = async () => {
    if (!testPhone) { Alert.alert('Enter a phone number'); return }
    setTesting(true)
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: testPhone, type: 'text', text: { body: '✅ Test from Biocare SMS app. WhatsApp is working!' } }),
      })
      const json = await res.json()
      if (res.ok) Alert.alert('✅ Sent!', `Message ID: ${json.messages?.[0]?.id}`)
      else Alert.alert('❌ Failed', json.error?.message ?? 'Unknown error')
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setTesting(false) }
  }

  if (loading) return <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={colors.cyan} />
        <Text style={styles.infoText}>
          Meta Cloud API · Free · No 3rd party{'\n'}
          Get credentials at developers.facebook.com
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Enable WhatsApp</Text>
            <Text style={styles.switchDesc}>Send assignment & reminder notifications</Text>
          </View>
          <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.purple }} thumbColor="#fff" />
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Phone Number ID</Text>
        <TextInput style={styles.input} value={phoneId} onChangeText={setPhoneId}
          placeholder="1234567890123456" placeholderTextColor="#475569"
          autoCapitalize="none" autoCorrect={false} />

        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Access Token</Text>
        <View style={{ position: 'relative' }}>
          <TextInput style={[styles.input, { paddingRight: 50 }]} value={token} onChangeText={setToken}
            placeholder="EAAxxxxxxx…" placeholderTextColor="#475569"
            secureTextEntry={!showToken} autoCapitalize="none" autoCorrect={false} />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowToken(s => !s)}>
            <Ionicons name={showToken ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textDim} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Connection</Text>
        <Text style={styles.cardSub}>Send a test message to verify credentials</Text>
        <TextInput style={[styles.input, { marginTop: 10 }]} value={testPhone} onChangeText={setTestPhone}
          placeholder="+254 712 345 678" placeholderTextColor="#475569" keyboardType="phone-pad" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.cyan }]} onPress={testSend} disabled={testing}>
          {testing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>📨 Send Test</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function RatesTab() {
  const [rates, setRates]     = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('service_rates').select('*').eq('is_active', true).order('service_type')
      .then(({ data }) => { setRates(data ?? []); setLoading(false) })
  }, [])

  const save = async (id: string) => {
    const { error } = await supabase.from('service_rates').update({ rate: parseFloat(editVal) }).eq('id', id)
    if (!error) { setRates(r => r.map(rt => rt.id === id ? { ...rt, rate: parseFloat(editVal) } : rt)); setEditing(null) }
    else Alert.alert('Error', error.message)
  }

  const SVC_LABELS: Record<string, string> = {
    preventive: 'Preventive Maintenance', corrective: 'Corrective Maintenance',
    installation: 'Installation', calibration: 'Calibration', emergency: 'Emergency',
  }

  if (loading) return <ActivityIndicator color={colors.purple} style={{ marginTop: 40 }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.ratesNote}>These rates apply to Cash Sales and completed Hire Purchase equipment</Text>
      <View style={styles.card}>
        {rates.map(r => (
          <View key={r.id} style={styles.rateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rateLabel}>{SVC_LABELS[r.service_type] ?? r.service_type}</Text>
              {r.description && <Text style={styles.rateDesc}>{r.description}</Text>}
            </View>
            {editing === r.id ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TextInput style={styles.rateInput} value={editVal} onChangeText={setEditVal} keyboardType="decimal-pad" />
                <TouchableOpacity style={styles.rateBtn} onPress={() => save(r.id)}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rateBtn, { backgroundColor: '#334155' }]} onPress={() => setEditing(null)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setEditing(r.id); setEditVal(String(r.rate)) }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.rateVal}>KES {r.rate?.toLocaleString()}</Text>
                <Ionicons name="pencil-outline" size={14} color={colors.cyan} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: colors.text },
  tabs:       { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab:        { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  tabActive:  { backgroundColor: colors.purple, borderColor: colors.purple },
  tabText:    { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  content:    { padding: 12, gap: 12, paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', gap: 10, backgroundColor: `${colors.cyan}15`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${colors.cyan}30` },
  infoText:   { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  card:       { backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: colors.text },
  cardSub:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  switchRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  switchDesc: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  divider:    { height: 1, backgroundColor: colors.cardBorder, marginVertical: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input:      { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  eyeBtn:     { position: 'absolute', right: 14, top: 13 },
  saveBtn:    { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ratesNote:  { fontSize: 12, color: colors.textDim, marginBottom: 4 },
  rateRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, gap: 10 },
  rateLabel:  { fontSize: 13, fontWeight: '600', color: colors.text },
  rateDesc:   { fontSize: 11, color: colors.textDim, marginTop: 1 },
  rateVal:    { fontSize: 14, fontWeight: '700', color: colors.emerald },
  rateInput:  { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: colors.text, width: 90, fontSize: 13 },
  rateBtn:    { backgroundColor: colors.purple, borderRadius: 8, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
})
