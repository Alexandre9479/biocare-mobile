import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Linking
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

const AV_COLOR: Record<string, string> = {
  available: '#10B981', on_service: '#3B82F6', on_leave: '#F59E0B', unavailable: '#EF4444',
}
const AV_LABEL: Record<string, string> = {
  available: 'Available', on_service: 'On Call', on_leave: 'On Leave', unavailable: 'Unavailable',
}

export default function EngineersScreen() {
  const [engineers, setEngineers]   = useState<any[]>([])
  const [jobCounts, setJobCounts]   = useState<Record<string, number>>({})
  const [loading,  setLoading]      = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const [{ data: engs }, { data: active }] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'engineer').order('availability_status').order('name'),
        supabase.from('service_assignments').select('engineer_id').in('status', ['scheduled', 'in_progress']),
      ])
      setEngineers(engs ?? [])
      const counts: Record<string, number> = {}
      active?.forEach(a => { if (a.engineer_id) counts[a.engineer_id] = (counts[a.engineer_id] ?? 0) + 1 })
      setJobCounts(counts)
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const available = engineers.filter(e => e.availability_status === 'available').length

  const renderItem = ({ item: eng }: { item: any }) => {
    const color  = AV_COLOR[eng.availability_status] ?? colors.textDim
    const jobs   = jobCounts[eng.id] ?? 0
    return (
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{eng.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{eng.name}</Text>
          <Text style={styles.email}>{eng.email}</Text>
          {eng.specializations?.length > 0 && (
            <Text style={styles.specs} numberOfLines={1}>{eng.specializations.join(' · ')}</Text>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <View style={[styles.avBadge, { backgroundColor: `${color}22` }]}>
              <View style={[styles.avDot, { backgroundColor: color }]} />
              <Text style={[styles.avText, { color }]}>{AV_LABEL[eng.availability_status]}</Text>
            </View>
            {jobs > 0 && (
              <View style={styles.jobBadge}>
                <Text style={styles.jobBadgeText}>{jobs} active job{jobs > 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        </View>
        {eng.phone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${eng.phone}`)} style={styles.callBtn}>
            <Ionicons name="call-outline" size={18} color={colors.cyan} />
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Engineers</Text>
        <Text style={styles.pageSub}>{engineers.length} total · {available} available</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={engineers}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>No engineers added yet</Text>
              <Text style={styles.emptyHint}>Add engineers via the web app Users section</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSub:    { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card:       { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.cardBorder },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${colors.purple}33`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.purple },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.purpleLight },
  name:       { fontSize: 15, fontWeight: '700', color: colors.text },
  email:      { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  specs:      { fontSize: 11, color: colors.textDim, marginTop: 2 },
  avBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  avDot:      { width: 6, height: 6, borderRadius: 3 },
  avText:     { fontSize: 10, fontWeight: '700' },
  jobBadge:   { backgroundColor: '#78350F22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  jobBadgeText: { fontSize: 10, color: '#FDE68A', fontWeight: '700' },
  callBtn:    { width: 38, height: 38, borderRadius: 10, backgroundColor: `${colors.cyan}15`, alignItems: 'center', justifyContent: 'center' },
  empty:      { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText:  { color: colors.textMuted, fontSize: 15 },
  emptyHint:  { color: colors.textDim, fontSize: 12, textAlign: 'center' },
})
