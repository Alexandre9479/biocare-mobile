import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

export default function QRScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  if (!permission) return <View style={styles.container} />

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="qr-code-outline" size={60} color={colors.textMuted} />
        <Text style={styles.title}>Camera Permission Required</Text>
        <Text style={styles.subtitle}>Allow camera access to scan QR codes on equipment.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const handleScan = ({ data }: { data: string }) => {
    if (scanned) return
    setScanned(true)

    // Expected URL format: https://...vercel.app/equipment/{id}
    // or http://localhost:5173/equipment/{id}
    const match = data.match(/\/equipment\/([a-f0-9-]{36})/)
    if (match) {
      const equipmentId = match[1]
      navigation.navigate('EquipmentDetail', { equipmentId })
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not a Biocare equipment label.',
        [{ text: 'Scan Again', onPress: () => setScanned(false) }]
      )
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <Text style={styles.instruction}>Point camera at a Biocare QR sticker</Text>
          </View>

          {/* Targeting box */}
          <View style={styles.targetBox}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          <View style={styles.bottomBar}>
            {scanned ? (
              <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.btnText}>Scan Again</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.hint}>QR code will scan automatically</Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const C = 24 // corner size

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#000' },
  camera:      { flex: 1 },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  topBar:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 20 },
  instruction: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  targetBox:   { width: 250, height: 250, alignSelf: 'center', position: 'relative' },
  corner:      { position: 'absolute', width: C, height: C, borderColor: colors.cyan, borderWidth: 3 },
  tl:          { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr:          { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl:          { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br:          { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  bottomBar:   { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 30 },
  btn:         { backgroundColor: colors.purple, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint:        { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  center:      { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  title:       { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle:    { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
})
