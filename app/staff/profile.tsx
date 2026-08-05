import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, StyleSheet, ScrollView, View, Text, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { staffService, StaffProfile } from '@/services/staffService';

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.1)';
const GREEN  = '#00d68f';

/* ── Inline input field ── */
function Field({
  label, value, onChangeText, editable = true,
  keyboardType, secureTextEntry, showToggle, onToggle,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  keyboardType?: any;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggle?: () => void;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.row, !editable && f.rowDisabled]}>
        <TextInput
          style={f.input}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholderTextColor="rgba(240,240,255,0.3)"
          allowFontScaling={false}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={f.eyeBtn}>
            <Ionicons
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={MUTED}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.8, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NAVY, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14,
  },
  rowDisabled: { opacity: 0.5 },
  input: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 12 },
  eyeBtn: { paddingLeft: 10 },
});

/* ── Message box ── */
function MsgBox({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  const ok = msg.type === 'success';
  return (
    <View style={[mb.box, ok ? mb.success : mb.error]}>
      <Ionicons
        name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={14}
        color={ok ? GREEN : PINK}
      />
      <Text style={[mb.text, { color: ok ? GREEN : PINK }]}>{msg.text}</Text>
    </View>
  );
}
const mb = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
  },
  success: { backgroundColor: 'rgba(0,214,143,0.08)', borderWidth: 1, borderColor: 'rgba(0,214,143,0.2)' },
  error: { backgroundColor: 'rgba(255,45,120,0.08)', borderWidth: 1, borderColor: 'rgba(255,45,120,0.2)' },
  text: { fontSize: 13, fontWeight: '600' },
});

type Msg = { type: 'success' | 'error'; text: string } | null;

function useAutoMsg(initial: Msg = null, delay = 3500) {
  const [msg, setMsg] = useState<Msg>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = (m: Msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg(m);
    if (m) timerRef.current = setTimeout(() => setMsg(null), delay);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return [msg, show] as const;
}

/* ════════════════════ MAIN SCREEN ════════════════════ */
export default function StaffProfileScreen() {
  const { session, logout, updateSessionStaff } = useAuth();
  const router = useRouter();

  const [profile, setProfile]     = useState<StaffProfile | null>(null);
  const [fullName, setFullName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [loadErr, setLoadErr]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, showSaveMsg]    = useAutoMsg();
  const [loggingOut, setLoggingOut] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCur, setShowCur]       = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [showCon, setShowCon]       = useState(false);
  const [pwdBusy, setPwdBusy]       = useState(false);
  const [pwdMsg, showPwdMsg]        = useAutoMsg();

  const fetchProfile = () => {
    setLoading(true);
    setLoadErr(false);
    staffService.getMe()
      .then((data) => {
        setProfile(data);
        setFullName(data.fullname || '');
        setPhone(data.phone || '');
      })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!fullName.trim()) {
      showSaveMsg({ type: 'error', text: 'Vui lòng nhập họ tên.' });
      return;
    }
    setSaving(true);
    try {
      const updated = await staffService.updateMe({
        fullname: fullName.trim(),
        email: profile.email,
        phone: phone.trim(),
        birthday: profile.birthday,
        avatar: profile.avatar,
      });
      setProfile(updated);
      updateSessionStaff({
        staffId: updated.staffId,
        fullname: updated.fullname,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
        avatar: updated.avatar,
        cinemaName: updated.cinemaName,
      });
      showSaveMsg({ type: 'success', text: 'Đã lưu thay đổi!' });
    } catch (err: any) {
      showSaveMsg({ type: 'error', text: err.message || 'Không cập nhật được.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      showPwdMsg({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      showPwdMsg({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    if (newPwd.length < 6) {
      showPwdMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    setPwdBusy(true);
    try {
      await staffService.changeMyPassword(currentPwd, newPwd);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      showPwdMsg({ type: 'success', text: 'Đã đổi mật khẩu thành công!' });
    } catch (err: any) {
      showPwdMsg({ type: 'error', text: err.message || 'Mật khẩu hiện tại không đúng.' });
    } finally {
      setPwdBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
              router.replace('/(auth)/login' as Href);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={YELLOW} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadErr) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={MUTED} style={{ marginBottom: 16 }} />
          <Text style={{ color: MUTED, fontSize: 15, marginBottom: 20, textAlign: 'center', paddingHorizontal: 32 }}>
            Không thể tải hồ sơ. Vui lòng kiểm tra kết nối và thử lại.
          </Text>
          <TouchableOpacity style={[styles.actionBtn, { paddingHorizontal: 24 }]} onPress={fetchProfile}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initial     = (profile?.fullname || 'N').charAt(0).toUpperCase();
  const displayName = profile?.fullname || session?.staff?.fullname || 'Nhân viên';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBadge}>
          <Ionicons name="person-circle-outline" size={13} color={YELLOW} />
          <Text style={styles.topBadgeText}>HỒ SƠ NHÂN VIÊN</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 52 }}
      >
        {/* ── Avatar section ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <View style={styles.badgeRow}>
            {!!profile?.role && (
              <View style={styles.roleBadge}>
                <Ionicons name="shield-checkmark-outline" size={11} color={PURPLE} />
                <Text style={styles.roleBadgeText}>{profile.role}</Text>
              </View>
            )}
            {!!profile?.cinemaName && (
              <View style={styles.cinemaBadge}>
                <Ionicons name="business-outline" size={11} color={YELLOW} />
                <Text style={styles.cinemaBadgeText}>{profile.cinemaName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Info card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardStrip} />
            <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          </View>

          <Field label="EMAIL" value={profile?.email || ''} editable={false} keyboardType="email-address" />
          <Field label="HỌ VÀ TÊN" value={fullName} onChangeText={setFullName} />
          <Field label="SỐ ĐIỆN THOẠI" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {!!profile?.birthday && (
            <Field label="NGÀY SINH" value={profile.birthday} editable={false} />
          )}
          {!!profile?.cinemaName && (
            <Field label="RẠP PHỤ TRÁCH" value={profile.cinemaName} editable={false} />
          )}

          <MsgBox msg={saveMsg} />

          <TouchableOpacity
            style={[styles.actionBtn, saving && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Lưu thay đổi</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* ── Password card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardStrip, { backgroundColor: PINK }]} />
            <Text style={styles.cardTitle}>Đổi mật khẩu</Text>
          </View>

          <Field
            label="MẬT KHẨU HIỆN TẠI"
            value={currentPwd}
            onChangeText={setCurrentPwd}
            secureTextEntry={!showCur}
            showToggle
            onToggle={() => setShowCur((v) => !v)}
          />
          <Field
            label="MẬT KHẨU MỚI"
            value={newPwd}
            onChangeText={setNewPwd}
            secureTextEntry={!showNew}
            showToggle
            onToggle={() => setShowNew((v) => !v)}
          />
          <Field
            label="XÁC NHẬN MẬT KHẨU MỚI"
            value={confirmPwd}
            onChangeText={setConfirmPwd}
            secureTextEntry={!showCon}
            showToggle
            onToggle={() => setShowCon((v) => !v)}
          />

          <MsgBox msg={pwdMsg} />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: PINK }, pwdBusy && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={pwdBusy}
          >
            {pwdBusy
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Cập nhật mật khẩu</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.btnDisabled]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? <ActivityIndicator size="small" color={PINK} />
            : <>
                <Ionicons name="log-out-outline" size={18} color={PINK} />
                <Text style={styles.logoutBtnText}>Đăng xuất</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Avatar section */
  avatarSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  avatarRing: {
    width: 94, height: 94, borderRadius: 47,
    borderWidth: 2, borderColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    padding: 4, marginBottom: 16,
  },
  avatarCircle: {
    width: 82, height: 82, borderRadius: 41,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '900', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '800', color: WHITE, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(139,0,255,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(139,0,255,0.25)',
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: PURPLE },
  cinemaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(212,255,0,0.2)',
  },
  cinemaBadgeText: { fontSize: 11, fontWeight: '700', color: YELLOW },

  /* Card */
  card: {
    margin: 16,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardStrip: { width: 4, height: 20, backgroundColor: PURPLE, borderRadius: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: WHITE, letterSpacing: 0.5 },

  /* Buttons */
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 13, marginTop: 4,
  },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  btnDisabled: { opacity: 0.6 },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: NAVY,
  },
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(212,255,0,0.18)',
  },
  topBadgeText: { fontSize: 11, fontWeight: '800', color: YELLOW, letterSpacing: 1 },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 4,
    borderRadius: 12, paddingVertical: 13,
    borderWidth: 1.5, borderColor: 'rgba(255,45,120,0.35)',
    backgroundColor: 'rgba(255,45,120,0.06)',
  },
  logoutBtnText: { fontSize: 15, fontWeight: '800', color: PINK },
});
