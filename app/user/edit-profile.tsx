import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Pressable, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/base/icon-symbol';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { useAuth } from '@/context/AuthContext';

/* ── Theme (nhất quán với profile.tsx) ───────────────────────────── */
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
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

/* ── Helpers ─────────────────────────────────────────────────────── */
function getInitials(name?: string) {
  return String(name || '?').trim().split(/\s+/).filter(Boolean)
    .slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
}

function formatBirthday(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Sub-components ──────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

function Field({
  label, value, onChangeText, error, editable = true, keyboardType = 'default', placeholder,
}: {
  label: string; value: string;
  onChangeText: (t: string) => void;
  error?: string; editable?: boolean;
  keyboardType?: any; placeholder?: string;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, !editable && s.fieldDisabled, !!error && s.fieldError]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={C.dim}
        autoCapitalize="none"
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function EditProfileScreen() {
  const { session, updateSessionUser } = useAuth();
  const user = session?.user;

  const [editing,  setEditing]  = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const [birthday, setBirthday] = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // birthday không có trong session → fetch thêm từ API
  useEffect(() => {
    setFullName(user?.fullname || '');
    setPhone(user?.phone || '');
    if (user?.userId) {
      setLoadingProfile(true);
      apiClient.get(API_ENDPOINTS.USER_DETAIL(user.userId))
        .then((data: any) => {
          const bd = data?.birthday ?? data?.data?.birthday ?? '';
          setBirthday(bd ? String(bd).slice(0, 10) : '');
        })
        .catch(() => {})
        .finally(() => setLoadingProfile(false));
    }
  }, [user?.userId]);

  const avatarUrl  = avatarPreview || user?.avatar?.trim() || '';
  const rankName   = user?.rankName || user?.membershipRankName || 'Đồng';

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để đổi ảnh đại diện.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    if (!user?.userId) { Alert.alert('Lỗi', 'Bạn cần đăng nhập lại.'); return; }

    const asset = result.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    setAvatarPreview(dataUrl);
    setUploadingAvatar(true);
    try {
      const updated = await apiClient.put(API_ENDPOINTS.USER_DETAIL(user.userId), {
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        birthday: birthday || null,
        status: (user as any).status ?? 1,
        avatar: dataUrl,
      });
      updateSessionUser({ ...user, ...(updated as typeof user) });
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện.');
    } catch (err: any) {
      setAvatarPreview('');
      Alert.alert('Lỗi cập nhật ảnh', err.message || 'Vui lòng thử lại.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEdit = () => {
    setErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setFullName(user?.fullname || '');
    setPhone(user?.phone || '');
    setErrors({});
    setEditing(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Họ tên không được để trống';
    if (!phone.trim())    e.phone    = 'Số điện thoại không được để trống';
    else if (phone.replace(/\D/g, '').length < 9) e.phone = 'Số điện thoại không hợp lệ';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!user?.userId) { Alert.alert('Lỗi', 'Bạn cần đăng nhập lại.'); return; }
    setSaving(true);
    try {
      const updated = await apiClient.put(API_ENDPOINTS.USER_DETAIL(user.userId), {
        fullname: fullName.trim(),
        email: user.email,
        phone: phone.trim().replace(/\s/g, ''),
        birthday: birthday || null,
        status: (user as any).status ?? 1,
        avatar: user.avatar || '',
      });
      updateSessionUser({ ...user, ...(updated as typeof user) });
      setEditing(false);
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
    } catch (err: any) {
      Alert.alert('Lỗi cập nhật', err.message || 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>Thông tin cá nhân</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Avatar section ── */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitials}>{getInitials(user?.fullname)}</Text>
              </View>
            )}
            <TouchableOpacity
              style={s.cameraBtn}
              activeOpacity={0.8}
              onPress={pickAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#fff" />
                : <IconSymbol name="camera.fill" size={13} color="#fff" />
              }
            </TouchableOpacity>
          </View>
          <Text style={s.avatarName}>{user?.fullname || 'Khách hàng'}</Text>
          <Text style={s.avatarEmail}>{user?.email || ''}</Text>
          <View style={s.rankBadge}>
            <View style={s.rankDot} />
            <Text style={s.rankText}>Hạng {rankName}</Text>
          </View>
        </View>

        {/* ── Card: Thông tin cá nhân ── */}
        <View style={s.section}>
          <View style={s.card}>

            {/* Card header */}
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                THÔNG TIN{' '}
                <Text style={{ color: C.yellow }}>CÁ NHÂN</Text>
              </Text>
              {!editing && (
                <TouchableOpacity style={s.editChip} onPress={startEdit} activeOpacity={0.8}>
                  <IconSymbol name="pencil" size={11} color={C.bg} />
                  <Text style={s.editChipText}>Chỉnh sửa</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.cardDivider} />

            {loadingProfile ? (
              <ActivityIndicator color={C.yellow} style={{ marginVertical: 20 }} />
            ) : editing ? (
              /* ── Edit mode ── */
              <>
                <Field
                  label="Họ và tên"
                  value={fullName}
                  onChangeText={v => { setFullName(v); setErrors(e => ({ ...e, fullName: '' })); }}
                  error={errors.fullName}
                  placeholder="Nhập họ và tên"
                />
                <Field
                  label="Email"
                  value={user?.email || ''}
                  onChangeText={() => {}}
                  editable={false}
                  placeholder="Email"
                />
                <Field
                  label="Số điện thoại"
                  value={phone}
                  onChangeText={v => { setPhone(v); setErrors(e => ({ ...e, phone: '' })); }}
                  error={errors.phone}
                  keyboardType="phone-pad"
                  placeholder="Nhập số điện thoại"
                />
                <Field
                  label="Ngày sinh"
                  value={birthday}
                  onChangeText={setBirthday}
                  placeholder="YYYY-MM-DD"
                />

                <View style={s.actionRow}>
                  <TouchableOpacity style={s.btnGhost} onPress={cancelEdit} activeOpacity={0.8}>
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
                      : <Text style={s.btnPrimaryText}>Cập nhật ngay</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── View mode ── */
              <>
                <InfoRow label="Họ và tên"      value={user?.fullname} />
                <InfoRow label="Email"            value={user?.email} />
                <InfoRow label="Số điện thoại"   value={user?.phone} />
                <InfoRow label="Ngày sinh"        value={formatBirthday(birthday)} />
                <InfoRow label="Hạng thành viên" value={rankName} />
              </>
            )}
          </View>
        </View>

        {/* ── Card: Bảo mật ── */}
        <View style={s.section}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>
                BẢO <Text style={{ color: C.purple }}>MẬT</Text>
              </Text>
            </View>
            <View style={s.cardDivider} />

            <View style={s.securityBlock}>
              <View style={[s.secIconWrap, { backgroundColor: '#007AFF22' }]}>
                <IconSymbol name="lock.fill" size={22} color="#007AFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.secTitle}>Mật khẩu</Text>
                <Text style={s.secSub}>Nên đổi mật khẩu định kỳ để bảo vệ tài khoản</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => router.push('/user/security' as any)}
              activeOpacity={0.85}
            >
              <IconSymbol name="lock.rotation" size={15} color="#fff" />
              <Text style={[s.btnPrimaryText, { marginLeft: 8 }]}>Đổi mật khẩu mới</Text>
            </TouchableOpacity>
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

  /* Avatar */
  avatarSection: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16 },
  avatarWrap:    { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: C.purple,
    ...Platform.select({
      ios:     { shadowColor: C.pink, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14 },
      android: { elevation: 10 },
    }),
  },
  avatarFallback: { backgroundColor: C.purple, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: 2 },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.yellow,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.bg,
  },
  avatarName:  { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  avatarEmail: { fontSize: 13, color: C.muted, marginBottom: 10 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: C.purple + '22',
    borderWidth: 1, borderColor: C.purple + '55',
  },
  rankDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: C.purple, marginRight: 6 },
  rankText: { fontSize: 12, fontWeight: '700', color: C.purple },

  /* Section & Card */
  section: { paddingHorizontal: 16, marginBottom: 14 },
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
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginBottom: 16,
  },

  /* Edit chip button */
  editChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: C.yellow,
  },
  editChipText: {
    fontSize: 12, fontWeight: '700',
    color: C.bg, marginLeft: 5,
  },

  /* View mode — info rows */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: C.text, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },

  /* Edit mode — fields */
  fieldWrap:  { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginBottom: 7, letterSpacing: 0.4 },
  fieldInput: {
    backgroundColor: C.card2,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  fieldDisabled: { color: C.muted, borderStyle: 'dashed' },
  fieldError:    { borderColor: C.error },
  errorText:     { color: C.error, fontSize: 11, marginTop: 5 },

  /* Action buttons row */
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnGhost: {
    flex: 1, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    backgroundColor: 'transparent',
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: C.muted },
  btnPrimary: {
    flex: 1, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: C.purple,
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* Security card */
  securityBlock: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 16,
  },
  secIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  secTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  secSub:   { fontSize: 12, color: C.muted, lineHeight: 17 },
});
