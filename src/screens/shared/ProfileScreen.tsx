import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, Image
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile, AvailabilityStatus } from '../../types'

const AV_OPTIONS: { value: AvailabilityStatus; label: string; color: string }[] = [
  { value: 'available',  label: 'Available',      color: '#10B981' },
  { value: 'on_service', label: 'On Service Call', color: '#3B82F6' },
  { value: 'on_leave',   label: 'On Leave',        color: '#F59E0B' },
  { value: 'unavailable',label: 'Unavailable',     color: '#EF4444' },
]

export default function ProfileScreen({ profile, onLogout }: { profile: Profile; onLogout: () => void }) {
  const [availability, setAvailability] = useState<AvailabilityStatus>(profile.availability_status)
  const [saving, setSaving] = useState(false)

  const updateAvailability = async (status: AvailabilityStatus) => {
    setSaving(true)
    setAvailability(status)
    const { error } = await supabase.from('profiles').update({ availability_status: status }).eq('id', profile.id)
    if (error) Alert.alert('Error', error.message)
    setSaving(false)
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ])
  }

  const current = AV_OPTIONS.find(a => a.value === availability)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: profile.role === 'admin' ? `${colors.purple}33` : `${colors.cyan}22` }]}>
            <Text style={[styles.roleText, { color: profile.role === 'admin' ? colors.purpleLight : colors.cyan }]}>
              {profile.role === 'admin' ? '🛡️ Administrator' : '🔧 Field Engineer'}
            </Text>
          </View>
        </View>

        {/* Availability — engineers only */}
        {profile.role === 'engineer' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Availability</Text>
            <Text style={styles.cardSub}>Admin sees this when assigning service jobs</Text>
            <View style={styles.divider} />
            {AV_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.avRow, availability === opt.value && { backgroundColor: `${opt.color}15`, borderRadius: 10 }]}
                onPress={() => updateAvailability(opt.value)}
                disabled={saving}
              >
                <View style={[styles.avDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.avLabel, availability === opt.value && { color: opt.color, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
                {availability === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={opt.color} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <View style={styles.divider} />
          <InfoRow icon="person-outline" label="Full Name" value={profile.name} />
          <InfoRow icon="mail-outline" label="Email" value={profile.email} />
          {profile.phone && <InfoRow icon="call-outline" label="Phone" value={profile.phone} />}
          {profile.specializations?.length > 0 && (
            <InfoRow icon="build-outline" label="Specializations" value={profile.specializations.join(', ')} />
          )}
        </View>

        {/* App info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Info</Text>
          <View style={styles.divider} />
          <InfoRow icon="phone-portrait-outline" label="App Version" value="1.0.0" />
          <InfoRow icon="server-outline" label="Backend" value="Supabase (Connected)" />
          <View style={styles.logoRow}>
            <Image source={require('../../../assets/biocare-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={colors.textDim} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  content:     { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: `${colors.purple}44`, borderWidth: 3, borderColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:  { fontSize: 32, fontWeight: '800', color: colors.purpleLight },
  name:        { fontSize: 22, fontWeight: '800', color: colors.text },
  email:       { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  roleBadge:   { marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText:    { fontSize: 13, fontWeight: '700' },
  card:        { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.cardBorder },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub:     { fontSize: 11, color: colors.textDim, marginTop: 2 },
  divider:     { height: 1, backgroundColor: colors.cardBorder, marginVertical: 12 },
  avRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8 },
  avDot:       { width: 10, height: 10, borderRadius: 5 },
  avLabel:     { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  infoRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  infoLabel:   { fontSize: 11, color: colors.textDim },
  infoValue:   { fontSize: 13, color: colors.text, fontWeight: '500', marginTop: 1 },
  logoRow:     { alignItems: 'center', marginTop: 8 },
  logo:        { width: 160, height: 40 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7F1D1D22', borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: '#EF444433', marginTop: 8 },
  logoutText:  { color: '#EF4444', fontSize: 16, fontWeight: '700' },
})
