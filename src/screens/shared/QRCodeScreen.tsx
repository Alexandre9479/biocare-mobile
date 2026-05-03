import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Share, Alert, ScrollView, Image
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'qrcode'
import { colors } from '../../theme'

const SALE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  cash:          { bg: '#065F46', text: '#34D399', label: 'Cash Sale' },
  placement:     { bg: '#7C2D12', text: '#FB923C', label: 'Placement' },
  hire_purchase: { bg: '#1E3A8A', text: '#93C5FD', label: 'Hire Purchase' },
}

export default function QRCodeScreen({ route, navigation }: any) {
  const { equipment } = route.params
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const url = `https://biocare-service-management.vercel.app/equipment/${equipment.id}`

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(console.error)
  }, [url])

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Biocare QR — ${equipment.facility_name}`,
        message: `Biocare Equipment Record\n\nFacility: ${equipment.facility_name}\nModel: ${equipment.subcategory?.name ?? '—'}\nS/N: ${equipment.serial_number ?? 'N/A'}\n\nScan or open: ${url}`,
        url,
      })
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  const handleCopyLink = async () => {
    await Share.share({ message: url })
  }

  const sale = SALE_COLORS[equipment.sale_type] ?? SALE_COLORS.cash

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>QR Code Sticker</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color={colors.cyan} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* The sticker — exactly matches web design */}
        <View style={styles.stickerWrap}>
          <View style={styles.sticker}>
            {/* Biocare logo */}
            <View style={styles.logoBg}>
              <Image
                source={require('../../../assets/biocare-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Red divider */}
            <View style={styles.redLine} />

            {/* QR Code */}
            {qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Ionicons name="qr-code-outline" size={80} color="#ccc" />
              </View>
            )}

            {/* Equipment info */}
            <Text style={styles.facilityName} numberOfLines={2}>{equipment.facility_name}</Text>
            <Text style={styles.modelName}>{equipment.subcategory?.name ?? '—'}</Text>
            <View style={styles.snBox}>
              <Text style={styles.snText}>S/N: {equipment.serial_number ?? 'N/A'}</Text>
            </View>
            <View style={[styles.saleBadge, { backgroundColor: sale.bg }]}>
              <Text style={[styles.saleText, { color: sale.text }]}>● {sale.label}</Text>
            </View>

            <View style={styles.stickerFooter}>
              <View style={styles.stickerFooterLine} />
              <Text style={styles.stickerFooterText}>📱 Scan to view service record</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How to use this sticker</Text>
          <View style={styles.infoStep}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Tap <Text style={styles.bold}>Share</Text> (top right) to send to WhatsApp, email, or save as screenshot</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>Print and stick on the physical machine at the facility</Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>Engineers scan with phone camera → opens service record instantly</Text>
          </View>
        </View>

        {/* Equipment summary */}
        <View style={styles.equipCard}>
          <Text style={styles.equipTitle}>Equipment</Text>
          {[
            ['Facility', equipment.facility_name],
            ['Model', equipment.subcategory?.name],
            ['Serial No.', equipment.serial_number],
            ['Region', equipment.region?.name],
            ['Sale Type', sale.label],
          ].map(([l, v]) => v ? (
            <View key={l as string} style={styles.equipRow}>
              <Text style={styles.equipLabel}>{l}</Text>
              <Text style={styles.equipVal}>{v}</Text>
            </View>
          ) : null)}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Share Sticker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }]} onPress={handleCopyLink}>
            <Ionicons name="link-outline" size={20} color={colors.cyan} />
            <Text style={[styles.actionBtnText, { color: colors.cyan }]}>Share Link</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.webHint}>
          💡 For bulk printing of multiple stickers, use the web app at{'\n'}
          biocare-service-management.vercel.app → Equipment → Print QR Stickers
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  backBtn:     { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '800', color: colors.text },
  shareBtn:    { width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.cyan}22`, alignItems: 'center', justifyContent: 'center' },
  content:     { alignItems: 'center', padding: 16 },
  stickerWrap: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 10, marginBottom: 20 },
  sticker:     { width: 240, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', padding: 12, alignItems: 'center' },
  logoBg:      { width: '100%', backgroundColor: '#ffffff', borderRadius: 6, padding: 4, marginBottom: 6 },
  logo:        { width: '100%', height: 36 },
  redLine:     { width: '100%', height: 2, backgroundColor: '#DC2626', marginBottom: 10 },
  qrImage:     { width: 140, height: 140, marginBottom: 8 },
  qrPlaceholder: { width: 140, height: 140, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  facilityName: { fontSize: 12, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 3 },
  modelName:   { fontSize: 10, fontWeight: '600', color: '#475569', marginBottom: 5 },
  snBox:       { backgroundColor: '#F8FAFC', borderWidth: 0.5, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 5 },
  snText:      { fontSize: 9, fontFamily: 'monospace', fontWeight: '700', color: '#1E293B' },
  saleBadge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 8 },
  saleText:    { fontSize: 8, fontWeight: '800' },
  stickerFooter: { width: '100%', alignItems: 'center' },
  stickerFooterLine: { width: '100%', height: 0.5, backgroundColor: '#E2E8F0', marginBottom: 5 },
  stickerFooterText: { fontSize: 8, color: '#94A3B8' },
  infoCard:    { width: '100%', backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  infoTitle:   { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  infoStep:    { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  stepNum:     { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepText:    { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  bold:        { color: colors.text, fontWeight: '700' },
  equipCard:   { width: '100%', backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 12 },
  equipTitle:  { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  equipRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder },
  equipLabel:  { fontSize: 11, color: colors.textDim },
  equipVal:    { fontSize: 12, color: colors.text, fontWeight: '500' },
  actions:     { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.purple, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  webHint:     { fontSize: 11, color: colors.textDim, textAlign: 'center', lineHeight: 18 },
})
