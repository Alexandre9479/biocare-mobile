import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'
import { colors } from '../theme'

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Enter your email and password'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) Alert.alert('Login Failed', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBg}>
            <Image source={require('../../assets/biocare-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.tagline}>Service Management System</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@biocare.co.ke"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <Text style={styles.hint}>Contact your administrator to reset your password.</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            { color: '#10B981', label: 'Cash Sale' },
            { color: '#F97316', label: 'Placement' },
            { color: '#3B82F6', label: 'Hire Purchase' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: colors.bg },
  container:   { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoWrap:    { alignItems: 'center', marginBottom: 28 },
  logoBg:      { backgroundColor: '#ffffff', borderRadius: 16, padding: 12, marginBottom: 12, width: 260 },
  logo:        { width: 236, height: 70 },
  tagline:     { color: colors.textMuted, fontSize: 13 },
  card:        { backgroundColor: colors.card, borderRadius: 16, padding: 22, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16 },
  title:       { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle:    { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  field:       { marginBottom: 14 },
  label:       { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  input:       { backgroundColor: '#0F172A', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15 },
  btn:         { backgroundColor: colors.purple, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  hint:        { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 14 },
  legend:      { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  legendText:  { color: colors.textMuted, fontSize: 11 },
})
