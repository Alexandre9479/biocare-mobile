import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

interface DupGroup {
  key: string
  type: 'serial' | 'facility_model'
  label: string
  items: any[]
  expanded: boolean
}

export default function DuplicateScannerScreen({ navigation }: any) {
  const [groups, setGroups]   = useState<DupGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filter, setFilter]   = useState<'all' | 'serial' | 'facility_model'>('all')

  const scan = async () => {
    setScanning(true)
    try {
      const { data: equips } = await supabase
        .from('equipment')
        .select('id, serial_number, facility_name, sale_type, status, next_service_date, subcategory_id, installation_date, created_at')
        .order('facility_name')

      if (!equips?.length) { setGroups([]); return }

      const subIds = [...new Set(equips.map(e => e.subcategory_id).filter(Boolean))]
      const { data: subs } = subIds.length
        ? await supabase.from('subcategories').select('id, name').in('id', subIds)
        : { data: [] }

      const enriched = equips.map(e => ({ ...e, subcategory: subs?.find((s: any) => s.id === e.subcategory_id) }))

      const found: DupGroup[] = []

      // 1. Serial number duplicates
      const bySerial: Record<string, any[]> = {}
      enriched.forEach(e => {
        const key = (e.serial_number ?? '').trim().toUpperCase()
        if (!key) return
        if (!bySerial[key]) bySerial[key] = []
        bySerial[key].push(e)
      })
      Object.entries(bySerial).forEach(([sn, items]) => {
        if (items.length > 1) {
          found.push({ key: `serial:${sn}`, type: 'serial', label: `S/N: ${sn}`, items, expanded: false })
        }
      })

      // 2. Same facility + same model
      const byFacilityModel: Record<string, any[]> = {}
      enriched.forEach(e => {
        const fac = (e.facility_name ?? '').trim().toUpperCase()
        const mod = (e.subcategory?.name ?? '').trim().toUpperCase()
        if (!fac || !mod) return
        const key = `${fac}||${mod}`
        if (!byFacilityModel[key]) byFacilityModel[key] = []
        byFacilityModel[key].push(e)
      })
      Object.entries(byFacilityModel).forEach(([, items]) => {
        if (items.length > 1) {
          const alreadyCaught = items.every(item =>
            found.some(g => g.type === 'serial' && g.items.some(i => i.id === item.id))
          )
          if (!alreadyCaught) {
            found.push({
              key: `fm:${items[0].facility_name}:${items[0].subcategory?.name}`,
              type: 'facility_model',
              label: `${items[0].facility_name} — ${items[0].subcategory?.name ?? 'Unknown'}`,
              items,
              expanded: false,
            })
          }
        }
      })

      found.sort((a, b) => {
        if (a.type === 'serial' && b.type !== 'serial') return -1
        if (a.type !== 'serial' && b.type === 'serial') return 1
        return b.items.length - a.items.length
      })

      setGroups(found)
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setLoading(false); setScanning(false) }
  }

  useEffect(() => { scan() }, [])

  const toggleExpand = (key: string) => {
    setGroups(prev => prev.map(g => g.key === key ? { ...g, expanded: !g.expanded } : g))
  }

  const handleDelete = (item: any, group: DupGroup) => {
    Alert.alert(
      'Delete Record',
      `Delete equipment at ${item.facility_name}?\n\nSerial: ${item.serial_number ?? 'N/A'}\nAdded: ${item.created_at?.slice(0, 10)}\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('equipment').delete().eq('id', item.id)
            if (error) Alert.alert('Error', error.message)
            else scan()
          }
        }
      ]
    )
  }

  const serialCount = groups.filter(g => g.type === 'serial').length
  const fmCount     = groups.filter(g => g.type === 'facility_model').length
  const shown       = filter === 'all' ? groups : groups.filter(g => g.type === filter)

  const SALE_COLORS: Record<string, string> = {
    cash: '#10B981', placement: '#F97316', hire_purchase: '#3B82F6',
  }

  const renderGroup = ({ item: g }: { item: DupGroup }) => (
    <View style={[styles.groupCard, { borderLeftColor: g.type === 'serial' ? '#EF4444' : '#F59E0B', borderLeftWidth: 3 }]}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => toggleExpand(g.key)}>
        <Ionicons name={g.type === 'serial' ? 'warning' : 'copy-outline'} size={18}
          color={g.type === 'serial' ? '#EF4444' : '#F59E0B'} />
        <View style={{ flex: 1 }}>
          <Text style={styles.groupLabel} numberOfLines={1}>{g.label}</Text>
          <Text style={styles.groupSub}>
            {g.items.length} records ·{' '}
            {g.type === 'serial' ? 'Exact serial match — likely data error' : 'Same facility + model'}
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: g.type === 'serial' ? '#7F1D1D33' : '#78350F33' }]}>
          <Text style={[styles.typeBadgeText, { color: g.type === 'serial' ? '#FCA5A5' : '#FDE68A' }]}>
            {g.type === 'serial' ? 'S/N dup' : 'Facility dup'}
          </Text>
        </View>
        <Ionicons name={g.expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
      </TouchableOpacity>

      {g.expanded && (
        <View style={styles.groupItems}>
          {g.items.map((item, idx) => (
            <View key={item.id} style={styles.dupItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dupNum}>#{idx + 1}</Text>
                <Text style={styles.dupFacility}>{item.facility_name}</Text>
                <Text style={styles.dupSub}>S/N: {item.serial_number ?? '—'} · {item.subcategory?.name ?? '—'}</Text>
                <Text style={styles.dupDate}>Added: {item.created_at?.slice(0, 10)}</Text>
                <View style={[styles.saleDot, { backgroundColor: SALE_COLORS[item.sale_type] ?? colors.textDim }]} />
              </View>
              <View style={styles.dupActions}>
                <TouchableOpacity style={styles.viewBtn}
                  onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}>
                  <Ionicons name="eye-outline" size={16} color={colors.cyan} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item, g)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Duplicate Scanner</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={scanning}>
          {scanning
            ? <ActivityIndicator size="small" color={colors.cyan} />
            : <Ionicons name="refresh" size={20} color={colors.cyan} />}
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={[styles.sumCard, { borderColor: serialCount > 0 ? '#EF4444' : colors.cardBorder }]}>
          <Text style={[styles.sumVal, { color: serialCount > 0 ? '#EF4444' : colors.emerald }]}>{serialCount}</Text>
          <Text style={styles.sumLabel}>Serial Dups</Text>
        </View>
        <View style={[styles.sumCard, { borderColor: fmCount > 0 ? '#F59E0B' : colors.cardBorder }]}>
          <Text style={[styles.sumVal, { color: fmCount > 0 ? '#F59E0B' : colors.emerald }]}>{fmCount}</Text>
          <Text style={styles.sumLabel}>Facility Dups</Text>
        </View>
        <View style={styles.sumCard}>
          <Text style={[styles.sumVal, { color: colors.emerald }]}>{groups.reduce((s, g) => s + g.items.length, 0)}</Text>
          <Text style={styles.sumLabel}>Affected</Text>
        </View>
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {([['all', `All (${groups.length})`], ['serial', `Serial (${serialCount})`], ['facility_model', `Facility (${fmCount})`]] as const).map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.filterChip, filter === val && styles.filterChipActive]}
            onPress={() => setFilter(val)}>
            <Text style={[styles.filterChipText, filter === val && styles.filterChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={56} color={colors.emerald} />
          <Text style={styles.emptyTitle}>No duplicates found!</Text>
          <Text style={styles.emptySub}>All equipment records are unique</Text>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={g => g.key}
          renderItem={renderGroup}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={scanning} onRefresh={scan} tintColor={colors.purple} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn:    { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 18, fontWeight: '800', color: colors.text },
  scanBtn:    { width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.cyan}22`, alignItems: 'center', justifyContent: 'center' },
  summary:    { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  sumCard:    { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  sumVal:     { fontSize: 22, fontWeight: '800' },
  sumLabel:   { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  filterRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  filterChip: { flex: 1, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  filterChipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  filterChipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  filterChipTextActive: { color: '#fff' },
  groupCard:  { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  groupSub:   { fontSize: 11, color: colors.textDim, marginTop: 2 },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  groupItems: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dupItem:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder },
  dupNum:     { fontSize: 10, color: colors.textDim, marginBottom: 2 },
  dupFacility: { fontSize: 13, fontWeight: '600', color: colors.text },
  dupSub:     { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  dupDate:    { fontSize: 10, color: colors.textDim, marginTop: 1 },
  saleDot:    { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  dupActions: { gap: 8 },
  viewBtn:    { width: 34, height: 34, borderRadius: 8, backgroundColor: `${colors.cyan}22`, alignItems: 'center', justifyContent: 'center' },
  delBtn:     { width: 34, height: 34, borderRadius: 8, backgroundColor: '#7F1D1D33', alignItems: 'center', justifyContent: 'center' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptySub:   { fontSize: 13, color: colors.textMuted },
})
