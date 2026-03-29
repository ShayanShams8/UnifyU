import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { updateMe, changePassword, deleteAccount } from "../api/client";
import { colors, borderRadius } from "../theme/colors";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tehran",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo",
  "Australia/Sydney", "America/Toronto", "America/Sao_Paulo",
];

export default function SettingsScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const { student, logout, refreshMe } = useAuth();
  const navigation = useNavigation<any>();
  const [showTimezone, setShowTimezone] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [linkedin, setLinkedin] = useState(student?.linkedin || "");
  const [email, setEmail] = useState(student?.email || "");
  const [socialLoading, setSocialLoading] = useState(false);

  const handleToggleShowName = async (val: boolean) => {
    try {
      await updateMe({ isShowName: val });
      await refreshMe();
    } catch {
      Alert.alert("Error", "Could not update setting");
    }
  };

  const handleTimezoneSelect = async (tz: string) => {
    setShowTimezone(false);
    try {
      await updateMe({ timezone: tz });
      await refreshMe();
    } catch {
      Alert.alert("Error", "Could not update timezone");
    }
  };

  const handleNotificationsToggle = async (val: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not supported",
        "Push notifications are not available in the web version. Use the mobile app.",
      );
      return;
    }
    setNotifications(val);
    if (val) {
      // On native: request permissions and register token
      try {
        const Notifications = require("expo-notifications");
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Enable notifications in your device settings.");
          setNotifications(false);
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await updateMe({ push_token: tokenData.data });
      } catch {
        Alert.alert("Error", "Could not register for notifications.");
        setNotifications(false);
      }
    } else {
      // Clear token
      try {
        await updateMe({ push_token: "" });
      } catch {}
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      Alert.alert("Error", "New password must be at least 8 characters");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      Alert.alert("Success", "Password changed successfully");
      setShowPasswordModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not change password");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSaveSocial = async () => {
    setSocialLoading(true);
    try {
      await updateMe({ linkedin: linkedin.trim(), email: email.trim() });
      await refreshMe();
      Alert.alert("Saved", "Social contacts updated");
      setShowSocialModal(false);
    } catch {
      Alert.alert("Error", "Could not update social contacts");
    } finally {
      setSocialLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    const msg = "This will permanently delete your account and all your posts. This cannot be undone.";
    if (Platform.OS === "web") {
      if (!window.confirm(msg)) return;
      deleteAccount()
        .then(() => logout())
        .catch((e: any) => {
          window.alert(e?.response?.data?.detail || "Could not delete account");
        });
      return;
    }
    Alert.alert("Delete Account", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount();
            logout();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.detail || "Could not delete account");
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to log out?")) return;
      logout();
      return;
    }
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (!student) return null;

  return (
    <View style={[styles.container, { height: windowHeight - 80, maxHeight: windowHeight - 80 }]}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{student.name}</Text>
            <Text style={styles.profileUser}>@{student.userName}</Text>
            {student.isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Visibility */}
        <SettingsSection title="Profile Visibility">
          <SettingsToggle
            icon="person-circle-outline"
            label="Show real name on profile"
            sub="Others see your real name when they view your profile"
            value={student.isShowName}
            onValueChange={handleToggleShowName}
          />
          <TouchableOpacity style={[styles.settingsRow, { borderTopWidth: 1, borderTopColor: `${colors.outlineVariant}20` }]} onPress={() => setShowSocialModal(true)}>
            <View style={styles.rowIcon}>
              <Ionicons name="link-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Social contacts</Text>
              <Text style={styles.rowSub}>
                {student.linkedin || student.email
                  ? [student.linkedin && "LinkedIn", student.email && "Email"].filter(Boolean).join(", ")
                  : "Not set"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </TouchableOpacity>
        </SettingsSection>

        {/* Timezone */}
        <SettingsSection title="Timezone">
          <TouchableOpacity style={styles.settingsRow} onPress={() => setShowTimezone(true)}>
            <View style={styles.rowIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Timezone</Text>
              <Text style={styles.rowValue}>{student.timezone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </TouchableOpacity>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            icon="notifications-outline"
            label="Push Notifications"
            sub="Get notified about comments and likes"
            value={notifications}
            onValueChange={handleNotificationsToggle}
          />
        </SettingsSection>

        {/* Admin Panel — only for admins */}
        {student?.isAdmin && (
          <SettingsSection title="Administration">
            <TouchableOpacity style={styles.settingsRow} onPress={() => navigation.navigate("AdminPanel")}>
              <View style={[styles.rowIcon, { backgroundColor: colors.primaryContainer }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.rowLabel, { flex: 1 }]}>Admin Panel</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.outline} />
            </TouchableOpacity>
          </SettingsSection>
        )}

        {/* Account */}
        <SettingsSection title="Account">
          <TouchableOpacity style={styles.settingsRow} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.rowIcon}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingsRow, { marginTop: 2 }]} onPress={handleDeleteAccount}>
            <View style={[styles.rowIcon, { backgroundColor: colors.errorContainer }]}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1, color: colors.error }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.error} />
          </TouchableOpacity>
        </SettingsSection>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>UnifyU v1.0.0</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPasswordModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <View style={pwStyles.header}>
            <Text style={pwStyles.title}>Change Password</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Ionicons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pwStyles.body}>
            <Text style={pwStyles.fieldLabel}>Current Password</Text>
            <TextInput
              style={pwStyles.input}
              placeholder="Enter current password"
              placeholderTextColor={colors.outline}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
              autoCapitalize="none"
            />
            <Text style={pwStyles.fieldLabel}>New Password</Text>
            <TextInput
              style={pwStyles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.outline}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
              autoCapitalize="none"
            />
            <Text style={pwStyles.fieldLabel}>Confirm New Password</Text>
            <TextInput
              style={pwStyles.input}
              placeholder="Repeat new password"
              placeholderTextColor={colors.outline}
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[pwStyles.saveBtn, pwLoading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={pwStyles.saveBtnText}>Save Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Social Contacts Modal */}
      <Modal visible={showSocialModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSocialModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <View style={pwStyles.header}>
            <Text style={pwStyles.title}>Social Contacts</Text>
            <TouchableOpacity onPress={() => setShowSocialModal(false)}>
              <Ionicons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={pwStyles.body}>
            <Text style={[pwStyles.fieldLabel, { marginTop: 0 }]}>
              These are shown to others who view your profile.
            </Text>
            <Text style={pwStyles.fieldLabel}>LinkedIn URL</Text>
            <TextInput
              style={pwStyles.input}
              placeholder="https://linkedin.com/in/yourname"
              placeholderTextColor={colors.outline}
              value={linkedin}
              onChangeText={setLinkedin}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={pwStyles.fieldLabel}>Email</Text>
            <TextInput
              style={pwStyles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.outline}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[pwStyles.saveBtn, socialLoading && { opacity: 0.6 }]}
              onPress={handleSaveSocial}
              disabled={socialLoading}
            >
              {socialLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={pwStyles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Timezone Modal */}
      <Modal visible={showTimezone} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.surface }}>
          <View style={tzStyles.header}>
            <Text style={tzStyles.title}>Select Timezone</Text>
            <TouchableOpacity onPress={() => setShowTimezone(false)}>
              <Ionicons name="close" size={24} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {TIMEZONES.map((tz) => (
              <TouchableOpacity
                key={tz}
                style={[tzStyles.row, student.timezone === tz && tzStyles.rowActive]}
                onPress={() => handleTimezoneSelect(tz)}
              >
                <Text style={[tzStyles.rowText, student.timezone === tz && tzStyles.rowTextActive]}>
                  {tz}
                </Text>
                {student.timezone === tz && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingsToggle({
  icon,
  label,
  sub,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
        thumbColor={value ? colors.primary : colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontFamily: "Manrope_800ExtraBold", fontSize: 28, color: colors.onSurface },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius["3xl"],
    padding: 20,
    gap: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: `${colors.primary}30`,
  },
  profileName: { fontFamily: "Manrope_800ExtraBold", fontSize: 18, color: colors.onSurface },
  profileUser: { fontFamily: "Manrope_500Medium", fontSize: 14, color: colors.onSurfaceVariant, marginTop: 2 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  adminBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 10, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: colors.onSurface },
  rowSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  rowValue: { fontFamily: "Manrope_500Medium", fontSize: 13, color: colors.primary, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: colors.primary },
  version: { textAlign: "center", fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.outline, marginBottom: 20 },
});

const pwStyles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: `${colors.outlineVariant}30` },
  title: { fontFamily: "Manrope_700Bold", fontSize: 18, color: colors.onSurface },
  body: { padding: 24, gap: 6 },
  fieldLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: colors.onSurfaceVariant, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}50`,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },
});

const tzStyles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: `${colors.outlineVariant}30` },
  title: { fontFamily: "Manrope_700Bold", fontSize: 18, color: colors.onSurface },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 },
  rowActive: { backgroundColor: colors.primaryContainer },
  rowText: { fontFamily: "Manrope_500Medium", fontSize: 15, color: colors.onSurface },
  rowTextActive: { color: colors.primary, fontFamily: "Manrope_700Bold" },
});
