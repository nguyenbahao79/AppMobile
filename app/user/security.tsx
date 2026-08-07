import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Pressable, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { useAuth } from '@/context/AuthContext';

/* ── Theme ───────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f102a',
  card:    '#141632',
  card2:   '#1b1e45',
  border:  'rgba(255,255,255,0.07)',
  purple:  '#7b1fa2',
  pink:    '#e91e8c',
  yellow:  '#d4e219',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.2)',
  divider: 'rgba(255,255,255,0.06)',
  error:   '#e57373',
  green:   '#4caf50',
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

/* ── Password strength ───────────────────────────────────────────── */
const STRONG_PW = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PW_RULE   = 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';

function getStrength(pw: string): { level: 0|1|2|3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  if (pw.length < 6) return { level: 1, label: 'Yếu', color: C.error };
  if (STRONG_PW.test(pw)) return { level: 3, label: 'Mạnh', color: C.green };
  if (pw.length >= 8)     return { level: 2, label: 'Trung bình', color: C.yellow };
  return { level: 1, label: 'Yếu', color: C.error };
}

/* ── PasswordField ───────────────────────────────────────────────── */
function PasswordField({
  label, value, onChangeText, error, showStrength = false, placeholder = '••••••••',
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  error?: string; showStrength?: boolean; placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? getStrength(value) : null;

  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputRow, !!error && s.inputRowError]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={C.dim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setVisible(v => !v)} style={s.eyeBtn} hitSlop={8}>
          <IconSymbol
            name={visible ? 'eye.slash.fill' : 'eye.fill'}
            size={17}
            color={C.muted}
          />
        </TouchableOpacity>
      </View>

      {/* Strength bar — chỉ hiện ở field mật khẩu mới */}
      {showStrength && value.length > 0 && strength && (
        <View style={s.strengthRow}>
          <View style={s.strengthTrack}>
            {[1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  s.strengthSegment,
                  { backgroundColor: i <= strength.level ? strength.color : C.border },
                ]}
              />
            ))}
          </View>
          <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function SecurityScreen() {
  const { session } = useAuth();
  const user = session?.user;

  const [current, setCurrent]   = useState('');
  const [newPw,   setNewPw]     = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errors,  setErrors]    = useState<Record<string, string>>({});
  const [saving,  setSaving]    = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!current) e.current = 'Nhập mật khẩu hiện tại';
    if (!newPw)   e.newPw   = 'Nhập mật khẩu mới';
    else if (!STRONG_PW.test(newPw)) e.newPw = PW_RULE;
    if (newPw !== confirm)  e.confirm = 'Mật khẩu xác nhận không khớp';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!user?.userId) { Alert.alert('Lỗi', 'Bạn cần đăng nhập lại.'); return; }
    setSaving(true);
    try {
      await apiClient.put(API_ENDPOINTS.USER_PASSWORD(user.userId), {
        currentPassword: current,
        newPassword: newPw,
      });
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.');
      setCurrent(''); setNewPw(''); setConfirm(''); setErrors({});
      router.back();
    } catch (err: any) {
      Alert.alert('Đổi mật khẩu thất bại', err.message || 'Vui lòng kiểm tra mật khẩu hiện tại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrent(''); setNewPw(''); setConfirm(''); setErrors({});
    router.back();
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>Bảo mật & Mật khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Info banner ── */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <IconSymbol name="lock.shield.fill" size={26} color={C.yellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Bảo vệ tài khoản của bạn</Text>
            <Text style={s.bannerSub}>
              Sử dụng mật khẩu mạnh, duy nhất — không dùng lại mật khẩu từ tài khoản khác.
            </Text>
          </View>
        </View>

        {/* ── Card: Đổi mật khẩu ── */}
        <View style={s.section}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                ĐỔI{' '}
                <Text style={{ color: C.purple }}>MẬT KHẨU</Text>
              </Text>
            </View>
            <View style={s.cardDivider} />

            <PasswordField
              label="Mật khẩu hiện tại"
              value={current}
              onChangeText={v => { setCurrent(v); setErrors(e => ({ ...e, current: '' })); }}
              error={errors.current}
            />
            <PasswordField
              label="Mật khẩu mới"
              value={newPw}
              onChangeText={v => { setNewPw(v); setErrors(e => ({ ...e, newPw: '' })); }}
              error={errors.newPw}
              showStrength
            />
            <PasswordField
              label="Xác nhận mật khẩu mới"
              value={confirm}
              onChangeText={v => { setConfirm(v); setErrors(e => ({ ...e, confirm: '' })); }}
              error={errors.confirm}
            />

            <View style={s.actionRow}>
              <TouchableOpacity style={s.btnGhost} onPress={handleCancel} activeOpacity={0.8}>
                <Text style={s.btnGhostText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.btnPrimaryText}>Lưu mật khẩu</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Card: Gợi ý bảo mật ── */}
        <View style={s.section}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                GỢI Ý{' '}
                <Text style={{ color: C.yellow }}>BẢO MẬT</Text>
              </Text>
            </View>
            <View style={s.cardDivider} />

            {[
              { icon: 'checkmark.circle.fill', color: C.green,  text: 'Tối thiểu 8 ký tự' },
              { icon: 'checkmark.circle.fill', color: C.green,  text: 'Kết hợp chữ hoa và chữ thường' },
              { icon: 'checkmark.circle.fill', color: C.green,  text: 'Có ít nhất một chữ số (0–9)' },
              { icon: 'checkmark.circle.fill', color: C.green,  text: 'Có ít nhất một ký tự đặc biệt (!@#$...)' },
              { icon: 'xmark.circle.fill',     color: C.error,  text: 'Không dùng tên hoặc ngày sinh' },
              { icon: 'xmark.circle.fill',     color: C.error,  text: 'Không dùng lại mật khẩu cũ' },
            ].map((tip, i) => (
              <View key={i} style={[s.tipRow, i > 0 && s.tipBorder]}>
                <IconSymbol name={tip.icon as any} size={16} color={tip.color} />
                <Text style={s.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 20 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: 0.3 },

  /* Banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 6,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.yellow + '12',
    borderWidth: 1,
    borderColor: C.yellow + '30',
    gap: 14,
  },
  bannerIcon:  { width: 48, height: 48, borderRadius: 14, backgroundColor: C.yellow + '20', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  bannerSub:   { fontSize: 12, color: C.muted, lineHeight: 17 },

  /* Section & Card */
  section: { paddingHorizontal: 16, marginTop: 14 },
  card: {
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    ...cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13, fontWeight: '800',
    color: C.text, letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginBottom: 18,
  },

  /* Password field */
  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 7, letterSpacing: 0.4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    height: 48,
    paddingHorizontal: 14,
  },
  inputRowError: { borderColor: C.error },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    height: '100%',
  },
  eyeBtn:    { paddingLeft: 10 },
  errorText: { color: C.error, fontSize: 11, marginTop: 5 },

  /* Strength bar */
  strengthRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  strengthTrack:  { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment:{ flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:  { fontSize: 11, fontWeight: '700', minWidth: 60, textAlign: 'right' },

  /* Buttons */
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnGhost: {
    flex: 1, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  btnGhostText:   { fontSize: 14, fontWeight: '700', color: C.muted },
  btnPrimary: {
    flex: 1, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.purple,
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Tips */
  tipRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  tipBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  tipText:   { fontSize: 13, color: C.muted, flex: 1 },
});
