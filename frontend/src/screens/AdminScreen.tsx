import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  adminStats,
  adminDeletePost,
  adminDeleteUser,
  adminListUsers,
  adminListPosts,
  adminPromoteUser,
} from "../api/client";
import { colors, borderRadius } from "../theme/colors";
import { formatDistanceToNow } from "../utils/time";

interface Stats { total_users: number; total_posts: number; total_comments: number }
interface AdminUser { id: number; userName: string; name: string; isAdmin: boolean; created_at: string }
interface AdminPost { id: number; author_username: string; isAnonymous: boolean; likes: number; created_at: string }

export default function AdminScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [deletePostId, setDeletePostId] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, uRes, pRes] = await Promise.all([adminStats(), adminListUsers(), adminListPosts()]);
      setStats(sRes.data);
      setUsers(uRes.data);
      setPosts(pRes.data);
    } catch {
      Alert.alert("Error", "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeletePost = async (id: number) => {
    if (Platform.OS === "web") {
      if (!window.confirm(`Delete post #${id}?`)) return;
      try {
        await adminDeletePost(id);
        setPosts((p) => p.filter((post) => post.id !== id));
        setStats((s) => s ? { ...s, total_posts: s.total_posts - 1 } : null);
        window.alert(`Post #${id} deleted successfully.`);
      } catch (e: any) {
        window.alert(e.response?.data?.detail || "Could not delete post");
      }
      return;
    }
    Alert.alert("Delete Post", `Delete post #${id}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminDeletePost(id);
            setPosts((p) => p.filter((post) => post.id !== id));
            setStats((s) => s ? { ...s, total_posts: s.total_posts - 1 } : null);
            Alert.alert("Success", `Post #${id} deleted successfully.`);
          } catch (e: any) {
            Alert.alert("Error", e.response?.data?.detail || "Could not delete");
          }
        },
      },
    ]);
  };

  const handleDeleteByIdInput = async () => {
    const id = parseInt(deletePostId);
    if (isNaN(id)) {
      if (Platform.OS === "web") { window.alert("Enter a valid Post ID"); } else { Alert.alert("Error", "Enter a valid Post ID"); }
      return;
    }
    await handleDeletePost(id);
    setDeletePostId("");
  };

  const handleDeleteUser = async (username: string) => {
    if (Platform.OS === "web") {
      if (!window.confirm(`Delete @${username} and all their posts?`)) return;
      try {
        await adminDeleteUser(username);
        setUsers((u) => u.filter((user) => user.userName !== username));
        setDeleteUsername("");
        window.alert(`@${username} deleted successfully.`);
      } catch (e: any) {
        window.alert(e.response?.data?.detail || "Could not delete user");
      }
      return;
    }
    Alert.alert("Delete User", `Delete @${username} and all their posts?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminDeleteUser(username);
            setUsers((u) => u.filter((user) => user.userName !== username));
            setDeleteUsername("");
            Alert.alert("Success", `@${username} deleted successfully.`);
          } catch (e: any) {
            Alert.alert("Error", e.response?.data?.detail || "Could not delete");
          }
        },
      },
    ]);
  };

  const handlePromote = async (username: string) => {
    try {
      await adminPromoteUser(username);
      setUsers((u) => u.map((user) => user.userName === username ? { ...user, isAdmin: true } : user));
      if (Platform.OS === "web") { window.alert(`@${username} is now an admin`); } else { Alert.alert("Success", `@${username} is now an admin`); }
    } catch (e: any) {
      if (Platform.OS === "web") { window.alert(e.response?.data?.detail || "Could not promote"); } else { Alert.alert("Error", e.response?.data?.detail || "Could not promote"); }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Admin Panel</Text>
          </View>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard icon="people-outline" label="Users" value={stats.total_users} />
            <StatCard icon="document-text-outline" label="Posts" value={stats.total_posts} />
            <StatCard icon="chatbubbles-outline" label="Comments" value={stats.total_comments} />
          </View>
        )}

        {/* Delete Post by ID */}
        <AdminSection title="Delete Post by ID" icon="trash-outline" iconColor={colors.error}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.adminInput}
              placeholder="Post ID (e.g. 42)"
              placeholderTextColor={colors.outline}
              value={deletePostId}
              onChangeText={setDeletePostId}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteByIdInput}>
              <Ionicons name="trash" size={18} color={colors.onError} />
              <Text style={styles.dangerBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </AdminSection>

        {/* Delete User by Username */}
        <AdminSection title="Delete User by Username" icon="person-remove-outline" iconColor={colors.error}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.adminInput}
              placeholder="@username"
              placeholderTextColor={colors.outline}
              value={deleteUsername}
              onChangeText={setDeleteUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => deleteUsername && handleDeleteUser(deleteUsername)}
            >
              <Ionicons name="person-remove" size={18} color={colors.onError} />
              <Text style={styles.dangerBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </AdminSection>

        {/* Recent Posts */}
        <AdminSection title="Recent Posts" icon="newspaper-outline">
          {posts.slice(0, 10).map((post) => (
            <View key={post.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listPrimary}>
                  #{post.id} · {post.isAnonymous ? "Anonymous" : `@${post.author_username}`}
                </Text>
                <Text style={styles.listSub}>
                  {post.likes} likes · {formatDistanceToNow(post.created_at)}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeletePost(post.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          {posts.length === 0 && <Text style={styles.emptyText}>No posts yet</Text>}
        </AdminSection>

        {/* Users */}
        <AdminSection title="Users" icon="people-outline">
          {users.slice(0, 20).map((user) => (
            <View key={user.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.listPrimary}>@{user.userName}</Text>
                  {user.isAdmin && (
                    <View style={styles.adminMini}>
                      <Text style={styles.adminMiniText}>ADMIN</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.listSub}>{user.name} · Joined {formatDistanceToNow(user.created_at)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!user.isAdmin && (
                  <TouchableOpacity style={styles.promoteBtn} onPress={() => handlePromote(user.userName)}>
                    <Ionicons name="shield-outline" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteUser(user.userName)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {users.length === 0 && <Text style={styles.emptyText}>No users yet</Text>}
        </AdminSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <View style={statStyles.card}>
      <Ionicons name={icon as any} size={22} color={colors.primary} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function AdminSection({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string;
  icon: string;
  iconColor?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={iconColor || colors.onSurfaceVariant} />
        <Text style={[styles.sectionTitle, iconColor ? { color: iconColor } : undefined]}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { paddingTop: 16, paddingBottom: 20, flexDirection: "row", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontFamily: "Manrope_800ExtraBold", fontSize: 26, color: colors.onSurface },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  adminInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: colors.onSurface,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.error,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerBtnText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: colors.onError },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}20`,
    gap: 8,
  },
  listPrimary: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: colors.onSurface },
  listSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  deleteIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.errorContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  promoteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  adminMini: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  adminMiniText: { fontFamily: "Manrope_700Bold", fontSize: 8, color: colors.primary, textTransform: "uppercase" },
  emptyText: { fontFamily: "Manrope_400Regular", fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", paddingVertical: 12 },
});

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  value: { fontFamily: "Manrope_800ExtraBold", fontSize: 26, color: colors.onSurface },
  label: { fontFamily: "Manrope_500Medium", fontSize: 11, color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 },
});
