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

import LoginScreen             from './src/screens/LoginScreen'
import EngineerDashboard       from './src/screens/EngineerDashboard'
import AssignmentDetailScreen  from './src/screens/AssignmentDetailScreen'
import LogServiceScreen        from './src/screens/LogServiceScreen'
import QRScannerScreen         from './src/screens/QRScannerScreen'
import EquipmentDetailScreen   from './src/screens/EquipmentDetailScreen'
import AdminDashboard          from './src/screens/admin/AdminDashboard'
import AdminAssignmentsScreen  from './src/screens/admin/AdminAssignmentsScreen'

import type { Profile } from './src/types'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

const HEADER = { backgroundColor: colors.card }
const HEADER_OPTS = { headerStyle: HEADER, headerTintColor: colors.text, headerShadowVisible: false }

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      colors.purple,
    background:   colors.bg,
    card:         colors.card,
    text:         colors.text,
    border:       colors.cardBorder,
    notification: colors.red,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium:  { fontFamily: 'System', fontWeight: '500' as const },
    bold:    { fontFamily: 'System', fontWeight: '700' as const },
    heavy:   { fontFamily: 'System', fontWeight: '900' as const },
  },
}

const TAB_OPTS = {
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopColor: colors.cardBorder,
    paddingBottom: 8,
    paddingTop: 4,
    height: 64,
  },
  tabBarActiveTintColor:   colors.purple,
  tabBarInactiveTintColor: colors.textDim,
  headerShown: false,
}

// ── Admin tab navigator ───────────────────────────────────────────────────────
function AdminTabs({ profile }: { profile: Profile }) {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...TAB_OPTS,
      tabBarIcon: ({ focused, color, size }) => {
        const map: Record<string, [string, string]> = {
          Dashboard:   ['grid',         'grid-outline'],
          Assignments: ['clipboard',    'clipboard-outline'],
          ScanQR:      ['qr-code',      'qr-code-outline'],
          Equipment:   ['hardware-chip','hardware-chip-outline'],
        }
        const [active, inactive] = map[route.name] ?? ['ellipse', 'ellipse-outline']
        return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
      },
    })}>

      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Dashboard' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="AdminHome" options={{ title: 'Dashboard' }}>
              {(p: any) => <AdminDashboard {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Assignments" options={{ tabBarLabel: 'Assign' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="AssignHome" options={{ title: 'Assignments' }}>
              {(p: any) => <AdminAssignmentsScreen {...p} profile={profile} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="ScanQR" options={{ tabBarLabel: 'Scan QR' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="Scanner" component={QRScannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Equipment" options={{ tabBarLabel: 'Equipment' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

// ── Engineer tab navigator ────────────────────────────────────────────────────
function EngineerTabs({ profile }: { profile: Profile }) {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...TAB_OPTS,
      tabBarIcon: ({ focused, color, size }) => {
        const map: Record<string, [string, string]> = {
          MyJobs:    ['briefcase',    'briefcase-outline'],
          ScanQR:    ['qr-code',      'qr-code-outline'],
          Equipment: ['hardware-chip','hardware-chip-outline'],
        }
        const [active, inactive] = map[route.name] ?? ['ellipse', 'ellipse-outline']
        return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
      },
    })}>

      <Tab.Screen name="MyJobs" options={{ tabBarLabel: 'My Jobs' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="EngineerHome" options={{ title: `Hi, ${profile.name.split(' ')[0]}` }}>
              {(p: any) => <EngineerDashboard {...p} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} options={{ title: 'Assignment Details' }} />
            <Stack.Screen name="LogService" component={LogServiceScreen} options={{ title: 'Log Service' }} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="ScanQR" options={{ tabBarLabel: 'Scan QR' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="Scanner" component={QRScannerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Equipment" options={{ tabBarLabel: 'Equipment' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={HEADER_OPTS}>
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
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
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) loadProfile(s.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) loadProfile(s.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

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
              <AdminTabs profile={profile} />
            ) : (
              <EngineerTabs profile={profile} />
            )}
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  splash:      { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  splashText:  { color: colors.textMuted, fontSize: 14 },
})

