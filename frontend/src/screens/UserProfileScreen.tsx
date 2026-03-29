import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUserProfile } from "../api/client";
import { colors, borderRadius } from "../theme/colors";

interface PublicProfile {
  userName: string;
  name?: string | null;
  pfp?: string | null;
  linkedin?: string | null;
  email?: string | null;
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { username } = route.params as { username: string };
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserProfile(username)
      .then((res) => setProfile(res.data))
      .catch(() => setError("Could not load profile."))
      .finally(() => setLoading(false));
  }, [username]);

  const openLinkedIn = () => {
    if (!profile?.linkedin) return;
    const url = profile.linkedin.startsWith("http")
      ? profile.linkedin
      : `https://${profile.linkedin}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Could not open LinkedIn link")
    );
  };

  const openEmail = () => {
    if (!profile?.email) return;
    Linking.openURL(`mailto:${profile.email}`).catch(() =>
      Alert.alert("Could not open email client")
    );
  };

  const initials = profile
    ? (profile.name || profile.userName)
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  const hasContact = profile?.linkedin || profile?.email;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.outlineVariant} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.username}>@{profile.userName}</Text>
            {profile.name && (
              <Text style={styles.realName}>{profile.name}</Text>
            )}
          </View>

          {/* Contact Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>

            {hasContact ? (
              <>
                {profile.linkedin && (
                  <TouchableOpacity style={styles.contactRow} onPress={openLinkedIn} activeOpacity={0.7}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="logo-linkedin" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.contactTextWrap}>
                      <Text style={styles.contactLabel}>LinkedIn</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        View profile
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.outline} />
                  </TouchableOpacity>
                )}

                {profile.email && (
                  <TouchableOpacity style={styles.contactRow} onPress={openEmail} activeOpacity={0.7}>
                    <View style={styles.contactIcon}>
                      <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.contactTextWrap}>
                      <Text style={styles.contactLabel}>Email</Text>
                      <Text style={styles.contactValue} numberOfLines={1}>
                        {profile.email}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.outline} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.noContactWrap}>
                <Ionicons name="information-circle-outline" size={20} color={colors.outlineVariant} />
                <Text style={styles.noContactText}>No contact info shared</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainer,
  },
  headerTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    color: colors.onSurface,
    letterSpacing: 0.2,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },

  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarInitials: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 32,
    color: colors.primary,
    letterSpacing: -1,
  },
  username: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  realName: {
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: 4,
  },
  cardTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.xl,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTextWrap: { flex: 1 },
  contactLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: colors.onSurface,
  },
  contactValue: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  noContactWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  noContactText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
});
