import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors } from '../../theme'
import type { Profile } from '../../types'

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  assignment:   { icon: 'person-add',         color: colors.cyan },
  service_due:  { icon: 'time',               color: '#F97316' },
  overdue:      { icon: 'warning',            color: '#EF4444' },
  completion:   { icon: 'checkmark-circle',   color: colors.emerald },
  system:       { icon: 'information-circle', color: colors.textMuted },
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#EF4444', high: '#F97316', medium: '#3B82F6', low: colors.textDim,
}

export default function NotificationsScreen({ profile }: { profile: Profile }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading,  setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(60)
      setNotifications(data ?? [])
    } catch (e: any) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  useEffect(() => { load() }, [])

  const unread = notifications.filter(n => !n.is_read).length

  const renderItem = ({ item: n }: { item: any }) => {
    const info = TYPE_ICON[n.type] ?? TYPE_ICON.system
    return (
      <TouchableOpacity
        onPress={() => { if (!n.is_read) markRead(n.id) }}
        style={[styles.card, !n.is_read && styles.cardUnread, { borderLeftColor: PRIORITY_COLOR[n.priority] ?? colors.textDim, borderLeftWidth: 3 }]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={info.icon as any} size={20} color={info.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.title, !n.is_read && styles.titleUnread]}>{n.title}</Text>
            {!n.is_read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
          <Text style={styles.time}>{new Date(n.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color={colors.cyan} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>{unread} unread notification{unread > 1 ? 's' : ''}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.purple} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.purple} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={44} color={colors.textDim} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitle:   { fontSize: 22, fontWeight: '800', color: colors.text },
  markAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  markAllText: { color: colors.cyan, fontSize: 13, fontWeight: '600' },
  unreadBanner: { backgroundColor: `${colors.purple}22`, marginHorizontal: 12, borderRadius: 10, padding: 10, marginBottom: 4 },
  unreadBannerText: { color: colors.purpleLight, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  card:        { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: colors.cardBorder },
  cardUnread:  { backgroundColor: '#1E293B' },
  iconWrap:    { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title:       { fontSize: 13, fontWeight: '600', color: colors.textMuted, flex: 1 },
  titleUnread: { color: colors.text, fontWeight: '700' },
  message:     { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  time:        { fontSize: 10, color: colors.textDim, marginTop: 5 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.purple, marginTop: 2 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:   { color: colors.textMuted, fontSize: 15 },
})
