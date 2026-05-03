import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  ScrollView, Alert, Switch
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile, UserRole, AvailabilityStatus } from '../../types'

const SPECIALIZATIONS = [
  'Hematology', 'Immunoassay', 'Chemistry', 'Immunofluorescence',
  'Urinalysis', 'ESR', 'Electrolyte', 'Blood Gas', 'Coagulation',
]

const AV_COLOR: Record<string, string> = {
  available: '#10B981', on_service: '#3B82F6', on_leave: '#F59E0B', unavailable: '#EF4444',
}
const AV_LABEL: Record<string, string> = {
  available: 'Available', on_service: 'On Call', on_leave: 'On Leave', unavailable: 'Unavailable',
}

export default function UsersScreen({ profile: currentUser }: { profile: Profile }) {
  const [users, setUsers]       = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal]       = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [saving, setSaving]     = useState(false)

  // Form
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [role, setRole]           = useState<UserRole>('engineer')
  const [phone, setPhone]         = useState('')
  const [specs, setSpecs]         = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityStatus>('available')

  const load = async () => {
    const { data } = await supabase.from('profiles').select('*').order('role').order('name')
    setUsers((data ?? []) as Profile[])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditUser(null)
    setName(''); setEmail(''); setPassword(''); setRole('engineer')
    setPhone(''); setSpecs([]); setAvailability('available')
    setModal(true)
  }

  const openEdit = (u: Profile) => {
    setEditUser(u)
    setName(u.name); setEmail(u.email); setPassword('')
    setRole(u.role); setPhone(u.phone ?? '')
    setSpecs(u.specializations ?? []); setAvailability(u.availability_status)
    setModal(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Enter a name'); return }

    setSaving(true)
    try {
      if (editUser) {
        const { error } = await supabase.from('profiles').update({
          name: name.trim(),
          role,
          phone: phone || null,
          specializations: specs,
          availability_status: availability,
        }).eq('id', editUser.id)
        if (error) throw error
        Alert.alert('✅ Updated', `${name} updated successfully`)
      } else {
        if (!email.trim() || !password) { Alert.alert('Required', 'Enter email and password'); setSaving(false); return }
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), role } }
        })
        if (authErr) throw authErr
        if (authData.user) {
          await supabase.from('profiles').update({
            name: name.trim(), role,
            phone: phone || null,
            specializations: specs,
            availability_status: availability,
          }).eq('id', authData.user.id)
        }
        Alert.alert('✅ Created', `${name} can now sign in with their email and password`)
      }
      setModal(false)
      load()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (u: Profile) => {
    if (u.id === currentUser.id) { Alert.alert('Cannot delete yourself'); return }
    Alert.alert('Remove User', `Remove ${u.name} from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('profiles').delete().eq('id', u.id)
          if (error) Alert.alert('Error', error.message)
          else load()
        }
      }
    ])
  }

  const toggleSpec = (s: string) =>
    setSpecs(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const admins    = users.filter(u => u.role === 'admin')
  const engineers = users.filter(u => u.role === 'engineer')

  const renderUser = ({ item: u }: { item: Profile }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{u.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{u.name}</Text>
        <Text style={styles.userEmail}>{u.email}</Text>
        {u.phone && <Text style={styles.userPhone}>{u.phone}</Text>}
        {u.specializations?.length > 0 && (
          <Text style={styles.userSpecs} numberOfLines={1}>{u.specializations.join(' · ')}</Text>
        )}
        {u.role === 'engineer' && (
          <View style={[styles.avBadge, { backgroundColor: `${AV_COLOR[u.availability_status]}22` }]}>
            <View style={[styles.avDot, { backgroundColor: AV_COLOR[u.availability_status] }]} />
            <Text style={[styles.avText, { color: AV_COLOR[u.availability_status] }]}>
              {AV_LABEL[u.availability_status]}
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: 6 }}>
        <TouchableOpacity onPress={() => openEdit(u)} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={16} color={colors.cyan} />
        </TouchableOpacity>
        {u.id !== currentUser.id && (
          <TouchableOpacity onPress={() => handleDelete(u)} style={[styles.iconBtn, { backgroundColor: '#7F1D1D22' }]}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const Section = ({ title, data }: { title: string; data: Profile[] }) => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{data.length}</Text>
      </View>
      {data.map(u => renderUser({ item: u }))}
    </>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => 'dummy'}
          renderItem={null}
          ListHeaderComponent={
            <View style={{ padding: 12, gap: 12 }}>
              <Section title="Administrators" data={admins} />
              <Section title="Engineers" data={engineers} />
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editUser ? 'Edit User' : 'Add User'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Full Name">
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Jane Doe" placeholderTextColor="#475569" />
              </Field>

              {!editUser && (
                <>
                  <Field label="Email">
                    <TextInput style={styles.input} value={email} onChangeText={setEmail}
                      placeholder="jane@example.com" placeholderTextColor="#475569"
                      keyboardType="email-address" autoCapitalize="none" />
                  </Field>
                  <Field label="Password">
                    <View style={{ position: 'relative' }}>
                      <TextInput style={[styles.input, { paddingRight: 46 }]} value={password} onChangeText={setPassword}
                        placeholder="Min 6 characters" placeholderTextColor="#475569"
                        secureTextEntry={!showPass} />
                      <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(s => !s)}>
                        <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textDim} />
                      </TouchableOpacity>
                    </View>
                  </Field>
                </>
              )}

              <Field label="Role">
                <View style={styles.roleRow}>
                  {(['engineer', 'admin'] as UserRole[]).map(r => (
                    <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleChipActive]}
                      onPress={() => setRole(r)}>
                      <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                        {r === 'admin' ? '🛡️ Admin' : '🔧 Engineer'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Phone (optional)">
                <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                  placeholder="+254 700 000 000" placeholderTextColor="#475569" keyboardType="phone-pad" />
              </Field>

              {role === 'engineer' && (
                <>
                  <Field label="Availability">
                    <View style={styles.avOptions}>
                      {(Object.keys(AV_LABEL) as AvailabilityStatus[]).map(av => (
                        <TouchableOpacity key={av} style={[styles.avChip, availability === av && { borderColor: AV_COLOR[av], backgroundColor: `${AV_COLOR[av]}15` }]}
                          onPress={() => setAvailability(av)}>
                          <View style={[styles.avDot, { backgroundColor: AV_COLOR[av] }]} />
                          <Text style={[styles.avChipText, availability === av && { color: AV_COLOR[av] }]}>{AV_LABEL[av]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Field>

                  <Field label="Specializations">
                    <View style={styles.specGrid}>
                      {SPECIALIZATIONS.map(s => (
                        <TouchableOpacity key={s} style={[styles.specChip, specs.includes(s) && styles.specChipActive]}
                          onPress={() => toggleSpec(s)}>
                          <Text style={[styles.specChipText, specs.includes(s) && styles.specChipTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Field>
                </>
              )}

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>{editUser ? 'Save Changes' : 'Create User'}</Text>}
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: colors.text },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 8 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount:  { backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 11, color: colors.textMuted, borderWidth: 1, borderColor: colors.cardBorder },
  userCard:   { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 8 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${colors.purple}33`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: `${colors.purple}66` },
  userAvatarText: { fontSize: 17, fontWeight: '800', color: colors.purpleLight },
  userName:   { fontSize: 14, fontWeight: '700', color: colors.text },
  userEmail:  { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  userPhone:  { fontSize: 11, color: colors.textDim, marginTop: 1 },
  userSpecs:  { fontSize: 10, color: colors.textDim, marginTop: 2 },
  avBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  avDot:      { width: 6, height: 6, borderRadius: 3 },
  avText:     { fontSize: 10, fontWeight: '700' },
  iconBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.cyan}15`, alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox:   { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  field:      { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input:      { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 14 },
  eyeBtn:     { position: 'absolute', right: 14, top: 13 },
  roleRow:    { flexDirection: 'row', gap: 10 },
  roleChip:   { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0F172A', borderWidth: 2, borderColor: colors.cardBorder, alignItems: 'center' },
  roleChipActive: { borderColor: colors.purple, backgroundColor: `${colors.purple}20` },
  roleChipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  roleChipTextActive: { color: colors.purpleLight },
  avOptions:  { gap: 8 },
  avChip:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: '#0F172A' },
  avChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  specGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder },
  specChipActive: { backgroundColor: `${colors.purple}33`, borderColor: colors.purple },
  specChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  specChipTextActive: { color: colors.purpleLight },
  saveBtn:    { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
