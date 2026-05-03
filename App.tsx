import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { supabase } from './src/lib/supabase'
import { colors } from './src/theme'
import type { Profile } from './src/types'

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginScreen             from './src/screens/LoginScreen'
import EngineerDashboard       from './src/screens/EngineerDashboard'
import AssignmentDetailScreen  from './src/screens/AssignmentDetailScreen'
import LogServiceScreen        from './src/screens/LogServiceScreen'
import QRScannerScreen         from './src/screens/QRScannerScreen'
import EquipmentDetailScreen   from './src/screens/EquipmentDetailScreen'
import AdminDashboard          from './src/screens/admin/AdminDashboard'
import AdminAssignmentsScreen  from './src/screens/admin/AdminAssignmentsScreen'
import AddEquipmentScreen      from './src/screens/admin/AddEquipmentScreen'
import EngineersScreen         from './src/screens/admin/EngineersScreen'
import AnalyticsScreen         from './src/screens/admin/AnalyticsScreen'
import SettingsScreen          from './src/screens/admin/SettingsScreen'
import MoreScreen              from './src/screens/admin/MoreScreen'
import UsersScreen             from './src/screens/admin/UsersScreen'
import PartsInventoryScreen    from './src/screens/admin/PartsInventoryScreen'
import ServiceCalendarScreen   from './src/screens/admin/ServiceCalendarScreen'
import EquipmentListScreen     from './src/screens/shared/EquipmentListScreen'
import ServiceHistoryScreen    from './src/screens/shared/ServiceHistoryScreen'
import NotificationsScreen     from './src/screens/shared/NotificationsScreen'
import ProfileScreen           from './src/screens/shared/ProfileScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

const H = { headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false }

const NAV_THEME = {
  dark: true,
  colors: { primary: colors.purple, background: colors.bg, card: colors.card, text: colors.text, border: colors.cardBorder, notification: colors.red },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium:  { fontFamily: 'System', fontWeight: '500' as const },
    bold:    { fontFamily: 'System', fontWeight: '700' as const },
    heavy:   { fontFamily: 'System', fontWeight: '900' as const },
  },
}

const TAB_BAR = {
  backgroundColor: colors.card,
  borderTopColor: colors.cardBorder,
  paddingBottom: 8,
  paddingTop: 4,
  height: 64,
}

// ── Admin Navigation ──────────────────────────────────────────────────────────
function AdminTabs({ profile, logout }: { profile: Profile; logout: () => void }) {
  const TAB_ICONS: Record<string, [string, string]> = {
    Dashboard:   ['grid',          'grid-outline'],
    Equipment:   ['hardware-chip', 'hardware-chip-outline'],
    Jobs:        ['clipboard',     'clipboard-outline'],
    More:        ['menu',          'menu-outline'],
  }
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarStyle: TAB_BAR,
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: colors.textDim,
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const [a, i] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline']
        return <Ionicons name={(focused ? a : i) as any} size={size} color={color} />
      },
    })}>

      {/* Dashboard */}
      <Tab.Screen name="Dashboard">
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="AdminHome" options={{ title: 'Dashboard' }}>
              {(p: any) => <AdminDashboard {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* Equipment */}
      <Tab.Screen name="Equipment">
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="EquipmentList" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentListScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment Detail' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
            <Stack.Screen name="AddEquipment" options={{ headerShown: false }}>
              {(p: any) => <AddEquipmentScreen {...p} profile={profile} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* Jobs/Assignments */}
      <Tab.Screen name="Jobs" options={{ tabBarLabel: 'Jobs' }}>
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="AssignHome" options={{ title: 'Assignments' }}>
              {(p: any) => <AdminAssignmentsScreen {...p} profile={profile} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* More hub */}
      <Tab.Screen name="More">
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="MoreHome" options={{ title: 'More' }}>
              {(p: any) => <MoreScreen {...p} profile={profile} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Engineers" options={{ title: 'Engineers' }} component={EngineersScreen} />
            <Stack.Screen name="Analytics" options={{ title: 'Analytics' }} component={AnalyticsScreen} />
            <Stack.Screen name="Settings" options={{ title: 'Settings' }}>
              {(p: any) => <SettingsScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="Notifications" options={{ title: 'Notifications' }}>
              {(p: any) => <NotificationsScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="ServiceHistory" options={{ title: 'Service History' }}>
              {(p: any) => <ServiceHistoryScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="Profile" options={{ title: 'My Profile' }}>
              {(p: any) => <ProfileScreen {...p} profile={profile} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Users" options={{ title: 'User Management' }}>
              {(p: any) => <UsersScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="Calendar" options={{ title: 'Service Calendar' }}>
              {(p: any) => <ServiceCalendarScreen {...p} />}
            </Stack.Screen>
            <Stack.Screen name="Parts" options={{ title: 'Parts Inventory' }}>
              {(p: any) => <PartsInventoryScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="ScanQR" options={{ headerShown: false }} component={QRScannerScreen} />
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

// ── Engineer Navigation ───────────────────────────────────────────────────────
function EngineerTabs({ profile, logout }: { profile: Profile; logout: () => void }) {
  const TAB_ICONS: Record<string, [string, string]> = {
    MyJobs:    ['briefcase',    'briefcase-outline'],
    Equipment: ['hardware-chip','hardware-chip-outline'],
    History:   ['document-text','document-text-outline'],
    ScanQR:    ['qr-code',      'qr-code-outline'],
    Profile:   ['person',       'person-outline'],
  }
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarStyle: TAB_BAR,
      tabBarActiveTintColor: colors.purple,
      tabBarInactiveTintColor: colors.textDim,
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        const [a, i] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline']
        return <Ionicons name={(focused ? a : i) as any} size={size} color={color} />
      },
    })}>

      <Tab.Screen name="MyJobs" options={{ tabBarLabel: 'My Jobs' }}>
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="EngineerHome" options={{ title: `Hi, ${profile.name.split(' ')[0]}` }}>
              {(p: any) => <EngineerDashboard {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} options={{ title: 'Job Details' }} />
            <Stack.Screen name="LogService" component={LogServiceScreen} options={{ title: 'Log Service' }} />
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Equipment">
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="EquipmentList" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentListScreen {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment Detail' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="History" options={{ tabBarLabel: 'History' }}>
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="HistoryHome" options={{ title: 'Service History' }}>
              {(p: any) => <ServiceHistoryScreen {...p} profile={profile} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="ScanQR" options={{ tabBarLabel: 'Scan QR' }}>
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="Scanner" component={QRScannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EquipmentDetail" options={{ title: 'Equipment' }}>
              {(p: any) => <EquipmentDetailScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {() => (
          <Stack.Navigator screenOptions={H}>
            <Stack.Screen name="ProfileHome" options={{ title: 'My Profile' }}>
              {(p: any) => <ProfileScreen {...p} profile={profile} onLogout={logout} />}
            </Stack.Screen>
            <Stack.Screen name="Notifications" options={{ title: 'Notifications' }}>
              {(p: any) => <NotificationsScreen {...p} profile={profile} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data as Profile ?? null)
    } catch { setProfile(null) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) loadProfile(s.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.user) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={colors.bg} />
        {loading ? (
          <View style={styles.splash}>
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={styles.splashText}>Loading Biocare SMS…</Text>
          </View>
        ) : (
          <NavigationContainer theme={NAV_THEME}>
            {!session || !profile ? (
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
              </Stack.Navigator>
            ) : profile.role === 'admin' ? (
              <AdminTabs profile={profile} logout={logout} />
            ) : (
              <EngineerTabs profile={profile} logout={logout} />
            )}
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  splash:     { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  splashText: { color: colors.textMuted, fontSize: 14 },
})

