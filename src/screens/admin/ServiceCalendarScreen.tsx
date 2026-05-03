import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['S','M','T','W','T','F','S']

const SALE_COLORS: Record<string, string> = {
  cash: '#10B981', placement: '#F97316', hire_purchase: '#3B82F6',
}

interface CalEvent {
  id: string; date: string; facilityName: string
  saleType: string; status: string; engineerName?: string
  daysLeft: number
}

export default function ServiceCalendarScreen({ navigation }: { navigation: any }) {
  const today = new Date()
  const [viewDate, setViewDate]     = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents]         = useState<CalEvent[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const load = async () => {
    try {
      const start = new Date(year, month, 1).toISOString().split('T')[0]
      const end   = new Date(year, month + 1, 0).toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]

      const [{ data: equip }, { data: overdueEq }] = await Promise.all([
        supabase.from('equipment')
          .select('id, facility_name, sale_type, next_service_date')
          .gte('next_service_date', start)
          .lte('next_service_date', end)
          .eq('status', 'active'),
        supabase.from('equipment')
          .select('id, facility_name, sale_type, next_service_date')
          .lt('next_service_date', start)
          .gte('next_service_date', new Date(year, month - 1, 1).toISOString().split('T')[0])
          .eq('status', 'active'),
      ])

      const allEquip = [...(equip ?? []), ...(overdueEq ?? [])]
      if (!allEquip.length) { setEvents([]); return }

      const equipIds = allEquip.map(e => e.id)
      const { data: assigns } = await supabase
        .from('service_assignments')
        .select('equipment_id, engineer_id, status')
        .in('equipment_id', equipIds)
        .in('status', ['pending', 'scheduled', 'in_progress'])

      const engIds = [...new Set((assigns ?? []).map(a => a.engineer_id).filter(Boolean))]
      const { data: engs } = engIds.length
        ? await supabase.from('profiles').select('id, name').in('id', engIds)
        : { data: [] }

      const now = new Date(); now.setHours(0,0,0,0)

      const calEvents: CalEvent[] = allEquip.map(e => {
        const assign = assigns?.find(a => a.equipment_id === e.id)
        const eng    = engs?.find(en => en.id === assign?.engineer_id)
        const daysLeft = Math.round((new Date(e.next_service_date).getTime() - now.getTime()) / 86400000)
        return {
          id: e.id,
          date: e.next_service_date,
          facilityName: e.facility_name,
          saleType: e.sale_type,
          status: daysLeft < 0 ? 'overdue' : assign ? assign.status : 'unassigned',
          engineerName: eng?.name,
          daysLeft,
        }
      })

      setEvents(calEvents)
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [year, month])

  // Build calendar grid
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (grid.length % 7 !== 0) grid.push(null)

  const eventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const prev = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const next = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))

  const overdueEvents  = events.filter(e => e.status === 'overdue')
  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : []

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
      >
        {/* Nav */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={prev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday}>
            <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Overdue banner */}
        {overdueEvents.length > 0 && (
          <View style={styles.overdueBanner}>
            <Ionicons name="warning" size={14} color="#FCA5A5" />
            <Text style={styles.overdueText}>{overdueEvents.length} overdue service{overdueEvents.length > 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Calendar grid */}
        <View style={styles.calCard}>
          {/* Day headers */}
          <View style={styles.dayRow}>
            {DAYS.map((d, i) => <Text key={i} style={styles.dayHdr}>{d}</Text>)}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.purple} style={{ padding: 30 }} />
          ) : (
            <View style={styles.gridWrap}>
              {Array.from({ length: grid.length / 7 }, (_, wi) => (
                <View key={wi} style={styles.week}>
                  {grid.slice(wi * 7, (wi + 1) * 7).map((day, di) => {
                    const dayEvents = day ? eventsForDay(day) : []
                    const isSelected = day === selectedDay
                    return (
                      <TouchableOpacity
                        key={di}
                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                        onPress={() => day && setSelectedDay(day === selectedDay ? null : day)}
                        disabled={!day}
                      >
                        {day ? (
                          <>
                            <View style={[styles.dayNum, isToday(day) && styles.dayNumToday]}>
                              <Text style={[styles.dayNumText, isToday(day) && styles.dayNumTodayText]}>{day}</Text>
                            </View>
                            {/* Event dots */}
                            <View style={styles.eventDots}>
                              {dayEvents.slice(0, 3).map((e, i) => (
                                <View key={i} style={[styles.dot, {
                                  backgroundColor: e.status === 'overdue' ? '#EF4444' :
                                    e.status === 'unassigned' ? '#64748B' :
                                    SALE_COLORS[e.saleType] ?? colors.purple
                                }]} />
                              ))}
                            </View>
                          </>
                        ) : null}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#10B981', label: 'Cash' }, { color: '#F97316', label: 'Placement' },
            { color: '#3B82F6', label: 'HP' }, { color: '#EF4444', label: 'Overdue' },
            { color: '#64748B', label: 'Unassigned' },
          ].map(l => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={[styles.dot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day events */}
        {selectedDay && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>
              {MONTHS[month]} {selectedDay}, {year} — {selectedEvents.length} service{selectedEvents.length !== 1 ? 's' : ''}
            </Text>
            {selectedEvents.length === 0 ? (
              <Text style={styles.noEvText}>No services on this day</Text>
            ) : (
              selectedEvents.map(e => (
                <TouchableOpacity key={e.id} style={styles.evCard}
                  onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: e.id })}>
                  <View style={[styles.evLine, { backgroundColor: e.status === 'overdue' ? '#EF4444' : SALE_COLORS[e.saleType] ?? colors.purple }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evFacility} numberOfLines={1}>{e.facilityName}</Text>
                    {e.engineerName && <Text style={styles.evEng}>👷 {e.engineerName}</Text>}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={[styles.evBadge, {
                        backgroundColor: e.status === 'overdue' ? '#7F1D1D' :
                          e.status === 'unassigned' ? '#1E293B' : '#064E3B'
                      }]}>
                        <Text style={[styles.evBadgeText, {
                          color: e.status === 'overdue' ? '#FCA5A5' :
                            e.status === 'unassigned' ? '#94A3B8' : '#34D399'
                        }]}>
                          {e.status === 'overdue' ? `${Math.abs(e.daysLeft)}d overdue` :
                            e.status === 'unassigned' ? 'Unassigned' : e.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Monthly list */}
        {events.filter(e => e.status !== 'overdue').length > 0 && !selectedDay && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>All services this month ({events.filter(e => e.status !== 'overdue').length})</Text>
            {events
              .filter(e => e.status !== 'overdue')
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(e => (
                <TouchableOpacity key={e.id} style={styles.evCard}
                  onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: e.id })}>
                  <View style={[styles.evLine, { backgroundColor: SALE_COLORS[e.saleType] ?? colors.purple }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evFacility} numberOfLines={1}>{e.facilityName}</Text>
                    <Text style={styles.evDate}>{new Date(e.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</Text>
                    {e.engineerName && <Text style={styles.evEng}>👷 {e.engineerName}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textDim} />
                </TouchableOpacity>
              ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  nav:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  monthLabel:    { fontSize: 18, fontWeight: '800', color: colors.text },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, backgroundColor: '#7F1D1D44', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#EF444433' },
  overdueText:   { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  calCard:       { backgroundColor: colors.card, marginHorizontal: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  dayRow:        { flexDirection: 'row', backgroundColor: '#0F172A', paddingVertical: 8 },
  dayHdr:        { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  gridWrap:      { paddingBottom: 4 },
  week:          { flexDirection: 'row' },
  dayCell:       { flex: 1, minHeight: 52, padding: 3, borderTopWidth: 0.5, borderTopColor: colors.cardBorder },
  dayCellSelected: { backgroundColor: `${colors.purple}15` },
  dayNum:        { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  dayNumToday:   { backgroundColor: colors.purple },
  dayNumText:    { fontSize: 11, color: colors.text, fontWeight: '500' },
  dayNumTodayText: { color: '#fff', fontWeight: '800' },
  eventDots:     { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  dot:           { width: 5, height: 5, borderRadius: 3 },
  legend:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  legendText:    { fontSize: 10, color: colors.textMuted },
  selectedSection: { paddingHorizontal: 12, marginTop: 8 },
  selectedTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  noEvText:      { color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  listSection:   { paddingHorizontal: 12, marginTop: 8 },
  listTitle:     { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  evCard:        { backgroundColor: colors.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder },
  evLine:        { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  evFacility:    { fontSize: 13, fontWeight: '700', color: colors.text },
  evDate:        { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  evEng:         { fontSize: 11, color: colors.cyan, marginTop: 1 },
  evBadge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  evBadgeText:   { fontSize: 10, fontWeight: '700' },
})
