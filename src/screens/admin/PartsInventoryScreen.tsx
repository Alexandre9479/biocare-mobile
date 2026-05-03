import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  ScrollView, Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

interface Part {
  id: string; part_name: string; part_number?: string; description?: string
  quantity_in_stock: number; reorder_level: number; unit_cost: number
  supplier_name?: string; supplier_contact?: string; location?: string; notes?: string
  subcategory_id?: string; is_active: boolean
  subcategory?: { name: string }
}

const BLANK = {
  part_name: '', part_number: '', description: '', quantity_in_stock: '0',
  reorder_level: '5', unit_cost: '0', supplier_name: '', supplier_contact: '',
  location: '', notes: '', subcategory_id: '',
}

export default function PartsInventoryScreen({ profile }: { profile: Profile }) {
  const [parts, setParts]           = useState<Part[]>([])
  const [subcats, setSubcats]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterLow, setFilterLow]   = useState(false)
  const [modal, setModal]           = useState(false)
  const [editPart, setEditPart]     = useState<Part | null>(null)
  const [movModal, setMovModal]     = useState<Part | null>(null)
  const [form, setForm]             = useState({ ...BLANK })
  const [movQty, setMovQty]         = useState('1')
  const [movType, setMovType]       = useState<'stock_in' | 'stock_out' | 'adjustment'>('stock_in')
  const [saving, setSaving]         = useState(false)

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const load = async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('parts_inventory').select('*, subcategory:subcategory_id(name)').eq('is_active', true).order('part_name'),
      supabase.from('subcategories').select('id, name').eq('is_active', true).order('name'),
    ])
    setParts((p ?? []) as Part[])
    setSubcats(s ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditPart(null)
    setForm({ ...BLANK })
    setModal(true)
  }

  const openEdit = (part: Part) => {
    setEditPart(part)
    setForm({
      part_name: part.part_name, part_number: part.part_number ?? '',
      description: part.description ?? '', quantity_in_stock: String(part.quantity_in_stock),
      reorder_level: String(part.reorder_level), unit_cost: String(part.unit_cost),
      supplier_name: part.supplier_name ?? '', supplier_contact: part.supplier_contact ?? '',
      location: part.location ?? '', notes: part.notes ?? '',
      subcategory_id: part.subcategory_id ?? '',
    })
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.part_name.trim()) { Alert.alert('Required', 'Enter a part name'); return }
    setSaving(true)
    try {
      const payload = {
        part_name: form.part_name.trim(),
        part_number: form.part_number || null,
        description: form.description || null,
        quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
        reorder_level: parseInt(form.reorder_level) || 5,
        unit_cost: parseFloat(form.unit_cost) || 0,
        supplier_name: form.supplier_name || null,
        supplier_contact: form.supplier_contact || null,
        location: form.location || null,
        notes: form.notes || null,
        subcategory_id: form.subcategory_id || null,
      }
      if (editPart) {
        const { error } = await supabase.from('parts_inventory').update(payload).eq('id', editPart.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('parts_inventory').insert(payload)
        if (error) throw error
      }
      setModal(false)
      load()
      Alert.alert('✅', editPart ? 'Part updated' : 'Part added')
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = (part: Part) => {
    Alert.alert('Remove Part', `Remove ${part.part_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          await supabase.from('parts_inventory').update({ is_active: false }).eq('id', part.id)
          load()
        }
      }
    ])
  }

  const handleMovement = async () => {
    if (!movModal) return
    setSaving(true)
    const qty   = parseInt(movQty) || 0
    const delta = movType === 'stock_out' ? -qty : qty
    const newQty = Math.max(0, movModal.quantity_in_stock + delta)
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('parts_inventory').update({ quantity_in_stock: newQty }).eq('id', movModal.id),
      supabase.from('parts_movements').insert({
        part_id: movModal.id, movement_type: movType, quantity: qty,
        reference_type: 'manual', performed_by: profile.id,
      }),
    ])
    setSaving(false)
    if (e1 || e2) Alert.alert('Error', (e1 || e2)?.message)
    else { setMovModal(null); load() }
  }

  const shown    = filterLow ? parts.filter(p => p.quantity_in_stock <= p.reorder_level) : parts
  const lowCount = parts.filter(p => p.quantity_in_stock <= p.reorder_level).length
  const totalVal = parts.reduce((s, p) => s + p.quantity_in_stock * p.unit_cost, 0)

  const renderPart = ({ item: p }: { item: Part }) => {
    const isOut  = p.quantity_in_stock === 0
    const isLow  = p.quantity_in_stock <= p.reorder_level
    const color  = isOut ? '#EF4444' : isLow ? '#F59E0B' : colors.emerald
    return (
      <View style={styles.partCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(isOut || isLow) && <Ionicons name="warning" size={13} color={color} />}
            <Text style={styles.partName}>{p.part_name}</Text>
          </View>
          {p.part_number && <Text style={styles.partNo}>PN: {p.part_number}</Text>}
          {p.subcategory?.name && <Text style={styles.partSub}>{p.subcategory.name}</Text>}
          {p.supplier_name && <Text style={styles.partSup}>{p.supplier_name}</Text>}
          {p.location && <Text style={styles.partLoc}>📦 {p.location}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' }}>
            <Text style={[styles.partStock, { color }]}>{p.quantity_in_stock} in stock</Text>
            <Text style={styles.partReorder}>Reorder at {p.reorder_level}</Text>
            <Text style={styles.partCost}>KES {p.unit_cost.toLocaleString()}/unit</Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#065F4666' }]}
            onPress={() => { setMovModal(p); setMovType('stock_in'); setMovQty('1') }}>
            <Ionicons name="add" size={14} color={colors.emerald} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#78350F44' }]}
            onPress={() => { setMovModal(p); setMovType('stock_out'); setMovQty('1') }}>
            <Ionicons name="remove" size={14} color="#F97316" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: `${colors.cyan}22` }]}
            onPress={() => openEdit(p)}>
            <Ionicons name="pencil-outline" size={13} color={colors.cyan} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stockBtn, { backgroundColor: '#7F1D1D33' }]}
            onPress={() => handleDelete(p)}>
            <Ionicons name="trash-outline" size={13} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.hdr}>
        <View>
          <Text style={styles.title}>Parts Inventory</Text>
          <Text style={styles.sub}>{parts.length} part types</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Part</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: lowCount > 0 ? '#EF4444' : colors.emerald }]}>{lowCount}</Text>
          <Text style={styles.summaryLbl}>Low Stock</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryVal, { color: colors.cyan }]}>KES {(totalVal / 1000).toFixed(0)}K</Text>
          <Text style={styles.summaryLbl}>Stock Value</Text>
        </View>
        <TouchableOpacity style={[styles.summaryCard, filterLow && { borderColor: '#EF4444' }]}
          onPress={() => setFilterLow(f => !f)}>
          <Ionicons name={filterLow ? 'filter' : 'filter-outline'} size={20} color={filterLow ? '#EF4444' : colors.textMuted} />
          <Text style={[styles.summaryLbl, filterLow && { color: '#EF4444' }]}>{filterLow ? 'All' : 'Low Only'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={p => p.id}
          renderItem={renderPart}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>{filterLow ? 'No low-stock parts' : 'No parts added yet'}</Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHdr}>
              <Text style={styles.modalTitle}>{editPart ? 'Edit Part' : 'Add Part'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Part Name *', key: 'part_name', placeholder: 'e.g. DYMIND Flow Cell' },
                { label: 'Part Number', key: 'part_number', placeholder: 'e.g. DH36-FC-001' },
                { label: 'Location (shelf/bin)', key: 'location', placeholder: 'e.g. Shelf A3' },
                { label: 'Supplier Name', key: 'supplier_name', placeholder: 'Supplier company' },
                { label: 'Supplier Contact', key: 'supplier_contact', placeholder: '+254 700...' },
              ].map(f => (
                <View key={f.key} style={styles.fld}>
                  <Text style={styles.fldLabel}>{f.label}</Text>
                  <TextInput style={styles.inp} value={(form as any)[f.key]} onChangeText={v => setF(f.key, v)}
                    placeholder={f.placeholder} placeholderTextColor="#475569" />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.fld, { flex: 1 }]}>
                  <Text style={styles.fldLabel}>Qty in Stock</Text>
                  <TextInput style={styles.inp} value={form.quantity_in_stock} onChangeText={v => setF('quantity_in_stock', v)} keyboardType="number-pad" />
                </View>
                <View style={[styles.fld, { flex: 1 }]}>
                  <Text style={styles.fldLabel}>Reorder Level</Text>
                  <TextInput style={styles.inp} value={form.reorder_level} onChangeText={v => setF('reorder_level', v)} keyboardType="number-pad" />
                </View>
                <View style={[styles.fld, { flex: 1 }]}>
                  <Text style={styles.fldLabel}>Unit Cost (KES)</Text>
                  <TextInput style={styles.inp} value={form.unit_cost} onChangeText={v => setF('unit_cost', v)} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.fld}>
                <Text style={styles.fldLabel}>Equipment Model</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.sc, form.subcategory_id === '' && styles.scActive]}
                      onPress={() => setF('subcategory_id', '')}>
                      <Text style={[styles.scText, form.subcategory_id === '' && styles.scTextActive]}>All</Text>
                    </TouchableOpacity>
                    {subcats.map(s => (
                      <TouchableOpacity key={s.id} style={[styles.sc, form.subcategory_id === s.id && styles.scActive]}
                        onPress={() => setF('subcategory_id', s.id)}>
                        <Text style={[styles.scText, form.subcategory_id === s.id && styles.scTextActive]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>{editPart ? 'Update Part' : 'Add Part'}</Text>}
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Stock movement modal */}
      <Modal visible={!!movModal} animationType="slide" transparent onRequestClose={() => setMovModal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '50%' }]}>
            <View style={styles.modalHdr}>
              <Text style={styles.modalTitle}>Update Stock</Text>
              <TouchableOpacity onPress={() => setMovModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {movModal && (
              <>
                <View style={styles.movInfo}>
                  <Text style={styles.movPartName}>{movModal.part_name}</Text>
                  <Text style={styles.movCurrent}>Current: <Text style={{ color: colors.emerald, fontWeight: '700' }}>{movModal.quantity_in_stock}</Text> in stock</Text>
                </View>
                <View style={styles.movTypeRow}>
                  {(['stock_in', 'stock_out', 'adjustment'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.movChip, movType === t && styles.movChipActive]}
                      onPress={() => setMovType(t)}>
                      <Text style={[styles.movChipText, movType === t && styles.movChipTextActive]}>
                        {t === 'stock_in' ? '+ In' : t === 'stock_out' ? '- Out' : '~ Adjust'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.fld}>
                  <Text style={styles.fldLabel}>Quantity</Text>
                  <TextInput style={styles.inp} value={movQty} onChangeText={setMovQty} keyboardType="number-pad" />
                </View>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleMovement} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Update Stock</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  hdr:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '800', color: colors.text },
  sub:         { fontSize: 12, color: colors.textMuted },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.purple, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  summaryRow:  { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  summaryVal:  { fontSize: 18, fontWeight: '800' },
  summaryLbl:  { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  partCard:    { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', borderWidth: 1, borderColor: colors.cardBorder },
  partName:    { fontSize: 14, fontWeight: '700', color: colors.text },
  partNo:      { fontSize: 10, fontFamily: 'monospace', color: colors.textDim, marginTop: 1 },
  partSub:     { fontSize: 11, color: colors.cyan, marginTop: 1 },
  partSup:     { fontSize: 11, color: colors.textDim, marginTop: 1 },
  partLoc:     { fontSize: 11, color: colors.textDim, marginTop: 1 },
  partStock:   { fontSize: 13, fontWeight: '700' },
  partReorder: { fontSize: 10, color: colors.textDim },
  partCost:    { fontSize: 10, color: colors.textDim },
  stockBtn:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:   { color: colors.textMuted, fontSize: 15 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox:    { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHdr:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: colors.text },
  fld:         { marginBottom: 12 },
  fldLabel:    { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 5 },
  inp:         { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 14 },
  sc:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder },
  scActive:    { backgroundColor: colors.purple, borderColor: colors.purple },
  scText:      { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  scTextActive: { color: '#fff' },
  saveBtn:     { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  movInfo:     { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 14 },
  movPartName: { fontSize: 15, fontWeight: '700', color: colors.text },
  movCurrent:  { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  movTypeRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  movChip:     { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  movChipActive: { borderColor: colors.purple, backgroundColor: `${colors.purple}25` },
  movChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  movChipTextActive: { color: colors.purpleLight },
})
