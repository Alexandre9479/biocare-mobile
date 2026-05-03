import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme'
import type { Profile } from '../../types'

interface MenuItem {
  icon: string
  label: string
  desc: string
  color: string
  screen: string
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'people-outline',        label: 'Engineers',        desc: 'View availability & workload',    color: colors.cyan,      screen: 'Engineers' },
  { icon: 'calendar-outline',      label: 'Service Calendar', desc: 'Monthly maintenance schedule',    color: '#8B5CF6',        screen: 'Calendar' },
  { icon: 'cube-outline',          label: 'Parts Inventory',  desc: 'Track spare parts & stock',       color: '#F59E0B',        screen: 'Parts' },
  { icon: 'bar-chart-outline',     label: 'Analytics',        desc: 'Revenue, performance & trends',   color: colors.emerald,   screen: 'Analytics' },
  { icon: 'cloud-upload-outline',  label: 'Import Equipment', desc: 'Import from Excel or quick-add',  color: '#3B82F6',        screen: 'ImportEquipment' },
  { icon: 'scan-outline',          label: 'Duplicate Scanner',desc: 'Find duplicate equipment records', color: '#EF4444',        screen: 'DuplicateScanner' },
  { icon: 'person-add-outline',    label: 'User Management',  desc: 'Create & manage accounts',        color: '#EC4899',        screen: 'Users' },
  { icon: 'settings-outline',      label: 'Settings',         desc: 'WhatsApp, rates & categories',    color: colors.textMuted, screen: 'Settings' },
  { icon: 'notifications-outline', label: 'Notifications',    desc: 'View all alerts & messages',      color: '#F97316',        screen: 'Notifications' },
]

export default function MoreScreen({ navigation, profile, onLogout }: { navigation: any; profile: Profile; onLogout: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile mini card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.profileBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity key={item.screen} style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textDim} style={{ marginTop: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoBg}>
            <Image source={require('../../../assets/biocare-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.version}>Biocare SMS v1.0.0</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  content:     { padding: 16, paddingBottom: 40 },
  profileCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  avatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: `${colors.purple}44`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.purple },
  avatarText:  { fontSize: 18, fontWeight: '800', color: colors.purpleLight },
  profileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  profileBtn:  { backgroundColor: `${colors.purple}33`, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  profileBtnText: { color: colors.purpleLight, fontWeight: '700', fontSize: 12 },
  menuGrid:    { gap: 10 },
  menuItem:    { backgroundColor: colors.card, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.cardBorder },
  menuIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { fontSize: 15, fontWeight: '700', color: colors.text },
  menuDesc:    { fontSize: 11, color: colors.textDim, flex: 1 },
  logoSection: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
  logoBg:      { backgroundColor: '#fff', borderRadius: 12, padding: 10, width: 200 },
  logo:        { width: 180, height: 50 },
  version:     { color: colors.textDim, fontSize: 11, marginTop: 8 },
  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7F1D1D22', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#EF444433' },
  logoutText:  { color: '#EF4444', fontSize: 15, fontWeight: '700' },
})
