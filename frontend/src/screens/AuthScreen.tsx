import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, borderRadius } from "../theme/colors";

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tehran",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo",
  "Australia/Sydney", "America/Toronto", "America/Sao_Paulo",
];

export default function AuthScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");

  // Login state
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // Signup state
  const [signupName, setSignupName] = useState("");
  const [signupUser, setSignupUser] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupTimezone, setSignupTimezone] = useState("UTC");
  const [signupLinkedin, setSignupLinkedin] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [showName, setShowName] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    console.log("[AuthScreen] handleLogin called", { loginUser });
    setLoginError("");
    if (!loginUser.trim() || !loginPass) {
      setLoginError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      console.log("[AuthScreen] calling POST /auth/login ...");
      await login(loginUser.trim(), loginPass);
      console.log("[AuthScreen] login success — navigating");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Invalid username or password";
      console.error("[AuthScreen] login error:", e?.response?.status, msg);
      setLoginError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    console.log("[AuthScreen] handleSignup called", { signupUser, signupName });
    setSignupError("");
    if (!signupName.trim() || !signupUser.trim() || !signupPass) {
      setSignupError("Please fill in all fields.");
      return;
    }
    if (signupPass.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      console.log("[AuthScreen] calling POST /auth/register ...");
      await register({
        name: signupName.trim(),
        userName: signupUser.trim(),
        password: signupPass,
        isShowName: showName,
        timezone: signupTimezone,
        linkedin: signupLinkedin.trim() || undefined,
        email: signupEmail.trim() || undefined,
      });
      console.log("[AuthScreen] register + auto-login success — navigating");
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Could not create account";
      console.error("[AuthScreen] signup error:", e?.response?.status, msg);
      setSignupError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { height: windowHeight, maxHeight: windowHeight }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Kinetic background blobs */}
      <View style={styles.blobTopRight} />
      <View style={styles.blobBottomLeft} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>UnifyU</Text>
          <Text style={styles.tagline}>For international students, by international students</Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "login" && styles.tabBtnActive]}
            onPress={() => setTab("login")}
          >
            <Text style={[styles.tabText, tab === "login" && styles.tabTextActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === "signup" && styles.tabBtnActive]}
            onPress={() => setTab("signup")}
          >
            <Text style={[styles.tabText, tab === "signup" && styles.tabTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {tab === "login" ? (
            <>
              <Text style={styles.formTitle}>Welcome back</Text>
              <InputField
                icon="person-outline"
                placeholder="Username"
                value={loginUser}
                onChangeText={setLoginUser}
                autoCapitalize="none"
              />
              <InputField
                icon="lock-closed-outline"
                placeholder="Password"
                value={loginPass}
                onChangeText={setLoginPass}
                secureTextEntry={!showPass}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Ionicons
                      name={showPass ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={colors.outline}
                    />
                  </TouchableOpacity>
                }
              />
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
              <PrimaryButton title={loading ? "Logging in..." : "Log In"} onPress={handleLogin} disabled={loading} />
              {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
            </>
          ) : (
            <>
              <Text style={styles.formTitle}>Join the community</Text>
              <InputField
                icon="person-outline"
                placeholder="Full name"
                value={signupName}
                onChangeText={setSignupName}
              />
              <InputField
                icon="at-outline"
                placeholder="Username"
                value={signupUser}
                onChangeText={setSignupUser}
                autoCapitalize="none"
              />
              <InputField
                icon="lock-closed-outline"
                placeholder="Password (min. 6 characters)"
                value={signupPass}
                onChangeText={setSignupPass}
                secureTextEntry={!showPass}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                    <Ionicons
                      name={showPass ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={colors.outline}
                    />
                  </TouchableOpacity>
                }
              />

              {/* Timezone Selector (simplified) */}
              <View style={styles.fieldRow}>
                <Ionicons name="time-outline" size={20} color={colors.outline} />
                <Text style={styles.fieldLabel}>Timezone: </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                  {TIMEZONES.map((tz) => (
                    <TouchableOpacity
                      key={tz}
                      style={[styles.tzChip, signupTimezone === tz && styles.tzChipActive]}
                      onPress={() => setSignupTimezone(tz)}
                    >
                      <Text style={[styles.tzText, signupTimezone === tz && styles.tzTextActive]}>
                        {tz.split("/").pop()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Show Name Toggle */}
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Show real name on my profile</Text>
                  <Text style={styles.toggleSub}>Others see your name when they view your profile</Text>
                </View>
                <Switch
                  value={showName}
                  onValueChange={setShowName}
                  trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                  thumbColor={showName ? colors.primary : colors.surface}
                />
              </View>

              {/* Optional social contacts */}
              <View style={styles.optionalSection}>
                <Text style={styles.optionalTitle}>Optional — visible to others on your profile</Text>
                <InputField
                  icon="logo-linkedin"
                  placeholder="LinkedIn URL (optional)"
                  value={signupLinkedin}
                  onChangeText={setSignupLinkedin}
                  autoCapitalize="none"
                />
                <InputField
                  icon="mail-outline"
                  placeholder="Email (optional)"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  autoCapitalize="none"
                />
              </View>

              <PrimaryButton
                title={loading ? "Creating account..." : "Sign Up"}
                onPress={handleSignup}
                disabled={loading}
              />
              {signupError ? <Text style={styles.errorText}>{signupError}</Text> : null}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  rightIcon,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  rightIcon?: React.ReactNode;
}) {
  return (
    <View style={inputStyles.wrapper}>
      <Ionicons name={icon as any} size={20} color={colors.outline} style={inputStyles.icon} />
      <TextInput
        style={inputStyles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "sentences"}
      />
      {rightIcon}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[btnStyles.btn, disabled && btnStyles.disabled]} onPress={onPress} disabled={disabled} activeOpacity={0.8}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDim]}
        style={btnStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        pointerEvents="none"
      >
        <Text style={btnStyles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, overflow: "hidden" },
  blobTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: `${colors.primary}0d`,
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -150,
    left: -150,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: `${colors.coral}0d`,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logo: {
    fontSize: 52,
    fontFamily: "Manrope_800ExtraBold",
    fontStyle: "italic",
    color: colors.primary,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Manrope_500Medium",
    color: colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: colors.surface },
  tabText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: { color: colors.primary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["3xl"],
    padding: 24,
    ...{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
  },
  formTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 24,
    color: colors.onSurface,
    marginBottom: 20,
  },
  forgotBtn: { alignSelf: "flex-end", marginTop: -4, marginBottom: 16 },
  forgotText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: colors.primary },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  fieldLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: colors.onSurfaceVariant },
  tzChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerHigh,
    marginRight: 6,
  },
  tzChipActive: { backgroundColor: colors.primaryContainer },
  tzText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: colors.onSurfaceVariant },
  tzTextActive: { color: colors.primary },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  toggleLabel: { fontFamily: "Manrope_700Bold", fontSize: 14, color: colors.onSurface },
  toggleSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  optionalSection: { marginBottom: 16 },
  optionalTitle: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 10,
    paddingLeft: 4,
  },
  errorText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: "#dc2626",
    textAlign: "center",
    marginTop: 8,
  },
});

const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 10,
  },
  icon: {},
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: colors.onSurface,
  },
});

const btnStyles = StyleSheet.create({
  btn: { borderRadius: borderRadius.full, overflow: "hidden", marginTop: 4 },
  disabled: { opacity: 0.6 },
  gradient: { paddingVertical: 16, alignItems: "center" },
  text: { fontFamily: "Manrope_700Bold", fontSize: 16, color: colors.onPrimary },
});
