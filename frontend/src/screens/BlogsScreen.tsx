import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { listPosts, createPost, likePost, deletePost } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, borderRadius } from "../theme/colors";
import PostCard from "../components/PostCard";
import { useNavigation } from "@react-navigation/native";

interface Post {
  id: number;
  author: number;
  title: string;
  content: string;
  author_username: string | null;
  author_name: string | null;
  author_pfp: string | null;
  isAnonymous: boolean;
  likes: number;
  liked_by_me: boolean;
  comment_count: number;
  created_at: string;
}

export default function BlogsScreen() {
  const { student } = useAuth();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await listPosts();
      setPosts(res.data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (id: number) => {
    try {
      await likePost(id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, liked_by_me: !p.liked_by_me, likes: p.liked_by_me ? p.likes - 1 : p.likes + 1 }
            : p
        )
      );
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (Platform.OS === "web") {
      if (!window.confirm("Delete this post? This cannot be undone.")) return;
      try {
        await deletePost(id);
        setPosts((prev) => prev.filter((p) => p.id !== id));
        window.alert("Post deleted successfully.");
      } catch (e: any) {
        window.alert(e.response?.data?.detail || "Could not delete post");
      }
      return;
    }
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(id);
            setPosts((prev) => prev.filter((p) => p.id !== id));
            Alert.alert("Success", "Post deleted successfully.");
          } catch (e: any) {
            Alert.alert("Error", e.response?.data?.detail || "Could not delete");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <Text style={styles.logo}>UnifyU</Text>
        </View>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={student?.id}
              isAdmin={student?.isAdmin}
              onLike={() => handleLike(item.id)}
              onDelete={() => handleDelete(item.id)}
              onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.outlineVariant} />
              <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
            </View>
          }
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(post) => {
          setPosts((prev) => [post, ...prev]);
          setShowCreateModal(false);
        }}
      />
    </SafeAreaView>
  );
}

function CreatePostModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (post: Post) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Post content cannot be empty");
      return;
    }
    setLoading(true);
    try {
      const res = await createPost({ title: title.trim(), content: content.trim(), isAnonymous });
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      onCreated(res.data);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>New Post</Text>
          <TouchableOpacity
            style={[modalStyles.postBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={modalStyles.postBtnText}>{loading ? "Posting..." : "Post"}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={modalStyles.titleInput}
          placeholder="Title (optional)"
          placeholderTextColor={colors.outline}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={modalStyles.contentInput}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.outline}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        <View style={modalStyles.anonRow}>
          <View style={{ flex: 1 }}>
            <Text style={modalStyles.anonLabel}>Post anonymously</Text>
            <Text style={modalStyles.anonSub}>Your username won't be shown</Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
            thumbColor={isAnonymous ? colors.primary : colors.surface}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}30`,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    fontStyle: "italic",
    color: colors.primary,
    letterSpacing: -1,
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "Manrope_500Medium", fontSize: 16, color: colors.onSurfaceVariant },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontFamily: "Manrope_700Bold", fontSize: 18, color: colors.onSurface },
  postBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: borderRadius.full },
  postBtnText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: colors.onPrimary },
  titleInput: {
    fontFamily: "Manrope_700Bold",
    fontSize: 22,
    color: colors.onSurface,
    marginBottom: 12,
    paddingVertical: 8,
  },
  contentInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 16,
    color: colors.onSurface,
    flex: 1,
    minHeight: 200,
  },
  anonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  anonLabel: { fontFamily: "Manrope_700Bold", fontSize: 14, color: colors.onSurface },
  anonSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
});
