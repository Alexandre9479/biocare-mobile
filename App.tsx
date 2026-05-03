import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { supabase } from './src/lib/supabase'
import { colors } from './src/theme'

import LoginScreen           from './src/screens/LoginScreen'
import EngineerDashboard     from './src/screens/EngineerDashboard'
import AssignmentDetailScreen from './src/screens/AssignmentDetailScreen'
import LogServiceScreen      from './src/screens/LogServiceScreen'
import QRScannerScreen       from './src/screens/QRScannerScreen'
import EquipmentDetailScreen from './src/screens/EquipmentDetailScreen'

import type { Profile } from './src/types'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

// ── Navigation theme ──────────────────────────────────────────────────────────
const navTheme = {
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

// ── Tab navigator (main app after login) ─────────────────────────────────────
function MainTabs({ profile }: { profile: Profile }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder, paddingBottom: 6, height: 60 },
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.textDim,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            'My Jobs':    focused ? 'briefcase'         : 'briefcase-outline',
            'Scan QR':    focused ? 'qr-code'           : 'qr-code-outline',
            'Equipment':  focused ? 'hardware-chip'     : 'hardware-chip-outline',
          }
          return <Ionicons name={(icons[route.name] ?? 'ellipse') as any} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="My Jobs">
        {(props: any) => (
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false }}>
            <Stack.Screen name="Dashboard" options={{ title: `Welcome, ${profile.name.split(' ')[0]}` }}>
              {(innerProps: any) => <EngineerDashboard {...innerProps} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} options={{ title: 'Assignment Details' }} />
            <Stack.Screen name="LogService" component={LogServiceScreen} options={{ title: 'Log Service' }} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Scan QR" options={{ title: 'Scan QR Code' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false }}>
            <Stack.Screen name="Scanner" component={QRScannerScreen} options={{ title: 'Scan QR Code', headerShown: false }} />
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Equipment" options={{ title: 'Equipment' }}>
        {(props: any) => (
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false }}>
            <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ title: 'Equipment' }} />
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  )
}

// ── Root component ────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]   = useState<any>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)

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

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile ?? null)
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>Loading Biocare SMS…</Text>
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        {!session || !profile ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Navigator>
        ) : (
          <MainTabs profile={profile} />
        )}
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

