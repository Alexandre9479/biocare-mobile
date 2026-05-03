import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

const SALE_INFO: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  cash:          { label: 'Cash Sale',     dot: '#10B981', bg: '#065F46', text: '#34D399' },
  placement:     { label: 'Placement',     dot: '#F97316', bg: '#7C2D12', text: '#FB923C' },
  hire_purchase: { label: 'Hire Purchase', dot: '#3B82F6', bg: '#1E3A8A', text: '#93C5FD' },
}

function DaysBadge({ date }: { date?: string }) {
  if (!date) return null
  const days = Math.round((new Date(date).getTime() - Date.now()) / 86400000)
  const isOverdue = days < 0
  const isDueSoon = days <= 7
  const bg    = isOverdue ? '#7F1D1D' : isDueSoon ? '#78350F' : '#1E3B3A'
  const color = isOverdue ? '#FCA5A5' : isDueSoon ? '#FDE68A' : '#6EE7B7'
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>
        {isOverdue ? `${Math.abs(days)}d over` : isDueSoon ? `${days}d left` : `${days}d`}
      </Text>
    </View>
  )
}

export default function EquipmentListScreen({ navigation, profile }: { navigation: any; profile: Profile }) {
  const [equipment, setEquipment] = useState<any[]>([])
  const [filtered,  setFiltered]  = useState<any[]>([])
  const [search,    setSearch]    = useState('')
  const [saleFilter, setSaleFilter] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data: equips } = await supabase
        .from('equipment')
        .select('id, serial_number, facility_name, sale_type, status, next_service_date, subcategory_id, region_id, hp_payment_status')
        .order('facility_name')

      if (!equips?.length) { setEquipment([]); setFiltered([]); return }

      const subIds = [...new Set(equips.map(e => e.subcategory_id).filter(Boolean))]
      const regIds = [...new Set(equips.map(e => e.region_id).filter(Boolean))]

      const [{ data: subs }, { data: regions }] = await Promise.all([
        subIds.length ? supabase.from('subcategories').select('id, name').in('id', subIds) : { data: [] },
        regIds.length ? supabase.from('regions').select('id, name').in('id', regIds) : { data: [] },
      ])

      const enriched = equips.map(e => ({
        ...e,
        subcategory: subs?.find(s => s.id === e.subcategory_id),
        region: regions?.find(r => r.id === e.region_id),
      }))
      setEquipment(enriched)
      setFiltered(enriched)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = equipment
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(e =>
        e.facility_name?.toLowerCase().includes(s) ||
        e.serial_number?.toLowerCase().includes(s) ||
        e.subcategory?.name?.toLowerCase().includes(s)
      )
    }
    if (saleFilter) result = result.filter(e => e.sale_type === saleFilter)
    setFiltered(result)
  }, [search, saleFilter, equipment])

  const renderItem = ({ item: e }: { item: any }) => {
    const info = SALE_INFO[e.sale_type] ?? SALE_INFO.cash
    return (
      <TouchableOpacity style={[styles.card, { borderLeftColor: info.dot, borderLeftWidth: 3 }]}
        onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: e.id })}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.facility} numberOfLines={1}>{e.facility_name}</Text>
            <Text style={styles.model}>{e.subcategory?.name ?? '—'} • S/N: {e.serial_number}</Text>
            <Text style={styles.region}>{e.region?.name ?? '—'}</Text>
          </View>
          <DaysBadge date={e.next_service_date} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <View style={[styles.badge, { backgroundColor: info.bg }]}>
            <View style={[styles.dot, { backgroundColor: info.dot }]} />
            <Text style={[styles.badgeText, { color: info.text }]}>{info.label}</Text>
          </View>
          {e.sale_type === 'hire_purchase' && e.hp_payment_status && (
            <View style={[styles.badge, { backgroundColor: e.hp_payment_status === 'completed' ? '#065F46' : '#1E3A8A' }]}>
              <Text style={[styles.badgeText, { color: e.hp_payment_status === 'completed' ? '#34D399' : '#93C5FD' }]}>
                HP: {e.hp_payment_status}
              </Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: e.status === 'active' ? '#064E3B' : '#44403C' }]}>
            <Text style={[styles.badgeText, { color: e.status === 'active' ? '#34D399' : '#A8A29E' }]}>
              {e.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search facility, S/N, model…"
            placeholderTextColor={colors.textDim}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>
        {profile.role === 'admin' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEquipment')}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.chips}>
        {[['', 'All'], ['cash', 'Cash'], ['placement', 'Placement'], ['hire_purchase', 'HP']].map(([val, label]) => (
          <TouchableOpacity key={val} onPress={() => setSaleFilter(val)}
            style={[styles.chip, saleFilter === val && styles.chipActive]}>
            <Text style={[styles.chipText, saleFilter === val && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.count}>{filtered.length} items</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="hardware-chip-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>No equipment found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  searchRow:  { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  searchBox:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: colors.cardBorder },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  addBtn:     { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  chips:      { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8, alignItems: 'center' },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
  chipText:   { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  count:      { fontSize: 11, color: colors.textDim, marginLeft: 'auto' },
  card:       { backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  facility:   { fontSize: 15, fontWeight: '700', color: colors.text },
  model:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  region:     { fontSize: 11, color: colors.textDim, marginTop: 1 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  badgeText:  { fontSize: 10, fontWeight: '700' },
  empty:      { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:  { color: colors.textMuted, fontSize: 15 },
})
