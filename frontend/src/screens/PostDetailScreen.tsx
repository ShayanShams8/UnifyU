import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getPost, likePost, createPost, deletePost } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, borderRadius } from "../theme/colors";
import { formatWithTimezone } from "../utils/time";

export default function PostDetailScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const { student } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const res = await getPost(postId);
      setPost(res.data);
    } catch {
      Alert.alert("Error", "Could not load post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleLike = async () => {
    if (!post) return;
    try {
      await likePost(post.id);
      setPost((p: any) => ({
        ...p,
        liked_by_me: !p.liked_by_me,
        likes: p.liked_by_me ? p.likes - 1 : p.likes + 1,
      }));
    } catch {}
  };

  const handleReply = (commentId: number, authorUsername: string | null) => {
    setReplyToId(commentId);
    setReplyToAuthor(authorUsername || "user");
  };

  const cancelReply = () => {
    setReplyToId(null);
    setReplyToAuthor(null);
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (!window.confirm("This will permanently delete the post.")) return;
      deletePost(post.id)
        .then(() => { window.alert("Post deleted successfully."); navigation.goBack(); })
        .catch((e: any) => { window.alert(e?.response?.data?.detail || "Could not delete post"); });
      return;
    }
    Alert.alert("Delete Post", "This will permanently delete the post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.id);
            Alert.alert("Success", "Post deleted successfully.");
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.detail || "Could not delete post");
          }
        },
      },
    ]);
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    const parentId = replyToId ?? post.id;
    try {
      const res = await createPost({ title: "", content: comment.trim(), parent: parentId });
      setPost((p: any) => {
        if (replyToId) {
          // Add reply to the matching comment
          const updated = (p.comments || []).map((c: any) => {
            if (c.id === replyToId) {
              return { ...c, replies: [...(c.replies || []), res.data] };
            }
            return c;
          });
          return { ...p, comments: updated };
        }
        // Top-level comment
        return { ...p, comments: [...(p.comments || []), { ...res.data, replies: [] }] };
      });
      setComment("");
      setReplyToId(null);
      setReplyToAuthor(null);
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.detail || "Could not post comment");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Back header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post #{post.id}</Text>
          {(student?.id === post.author || student?.isAdmin) ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Author */}
          <View style={styles.authorRow}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {post.isAnonymous ? "Anonymous" : `@${post.author_username || "unknown"}`}
              </Text>
              <Text style={styles.authorTime}>
                {student ? formatWithTimezone(post.created_at, student.timezone) : post.created_at}
              </Text>
            </View>
          </View>

          {/* Title */}
          {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}

          {/* Content */}
          <Text style={styles.postContent}>{post.content}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
              <Ionicons
                name={post.liked_by_me ? "heart" : "heart-outline"}
                size={22}
                color={post.liked_by_me ? "#ef4444" : colors.onSurfaceVariant}
              />
              <Text style={[styles.actionText, post.liked_by_me && { color: "#ef4444" }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={22} color={colors.onSurfaceVariant} />
              <Text style={styles.actionText}>{post.comments?.length || 0}</Text>
            </View>
          </View>

          {/* Comments Section */}
          <Text style={styles.commentsHeader}>
            Comments ({post.comments?.length || 0})
          </Text>

          {post.comments?.map((c: any) => (
            <View key={c.id}>
              {/* Level-1 comment */}
              <View style={styles.commentCard}>
                <View style={styles.commentAuthorRow}>
                  <View style={styles.commentAvatar}>
                    <Ionicons name="person" size={12} color={colors.primary} />
                  </View>
                  <Text style={styles.commentAuthor}>
                    {c.isAnonymous ? "Anonymous" : `@${c.author_username || "unknown"}`}
                  </Text>
                  <Text style={styles.commentTime}>
                    {student ? formatWithTimezone(c.created_at, student.timezone) : c.created_at}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{c.content}</Text>
                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={() => handleReply(c.id, c.author_username)}
                >
                  <Ionicons name="return-down-forward-outline" size={12} color={colors.primary} />
                  <Text style={styles.replyBtnText}>Reply</Text>
                </TouchableOpacity>
              </View>

              {/* Level-2 replies */}
              {(c.replies || []).map((r: any) => (
                <View key={r.id} style={styles.replyCard}>
                  <View style={styles.replyAccent} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentAuthorRow}>
                      <View style={[styles.commentAvatar, styles.replyAvatar]}>
                        <Ionicons name="person" size={10} color={colors.primary} />
                      </View>
                      <Text style={[styles.commentAuthor, { fontSize: 12 }]}>
                        {r.isAnonymous ? "Anonymous" : `@${r.author_username || "unknown"}`}
                      </Text>
                      <Text style={styles.commentTime}>
                        {student ? formatWithTimezone(r.created_at, student.timezone) : r.created_at}
                      </Text>
                    </View>
                    <Text style={[styles.commentContent, { fontSize: 13 }]}>{r.content}</Text>
                    <TouchableOpacity
                      style={styles.replyBtn}
                      onPress={() => handleReply(c.id, c.author_username)}
                    >
                      <Ionicons name="return-down-forward-outline" size={11} color={colors.primary} />
                      <Text style={[styles.replyBtnText, { fontSize: 10 }]}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom area — padded to clear absolute tab bar (80px) */}
        <View style={{ paddingBottom: 80 }}>
          {/* Reply context badge */}
          {replyToId && (
            <View style={styles.replyContext}>
              <Ionicons name="return-down-forward-outline" size={14} color={colors.primary} />
              <Text style={styles.replyContextText}>Replying to @{replyToAuthor}</Text>
              <TouchableOpacity onPress={cancelReply}>
                <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          )}

          {/* Comment Input */}
          <View style={styles.commentBar}>
            <TextInput
              style={styles.commentInput}
              placeholder={replyToId ? `Reply to @${replyToAuthor}...` : "Add a comment..."}
              placeholderTextColor={colors.outline}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!comment.trim() || posting) && styles.sendBtnDisabled]}
              onPress={handleComment}
              disabled={!comment.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}30`,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Manrope_700Bold", fontSize: 16, color: colors.onSurfaceVariant },
  scroll: { padding: 20 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: { fontFamily: "Manrope_700Bold", fontSize: 16, color: colors.onSurface },
  authorTime: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  postTitle: { fontFamily: "Manrope_800ExtraBold", fontSize: 26, color: colors.onSurface, lineHeight: 34, marginBottom: 16 },
  postContent: { fontFamily: "Manrope_400Regular", fontSize: 16, color: colors.onSurfaceVariant, lineHeight: 26, marginBottom: 24 },
  actions: {
    flexDirection: "row",
    gap: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}30`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}30`,
    marginBottom: 24,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: colors.onSurfaceVariant },
  commentsHeader: { fontFamily: "Manrope_800ExtraBold", fontSize: 18, color: colors.onSurface, marginBottom: 16 },
  commentCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    marginBottom: 6,
  },
  commentAuthorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  replyAvatar: { width: 22, height: 22, borderRadius: 11 },
  commentAuthor: { fontFamily: "Manrope_700Bold", fontSize: 13, color: colors.onSurface, flex: 1 },
  commentTime: { fontFamily: "Manrope_400Regular", fontSize: 11, color: colors.outline },
  commentContent: { fontFamily: "Manrope_400Regular", fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20 },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  replyBtnText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: colors.primary },
  replyCard: {
    flexDirection: "row",
    marginLeft: 20,
    marginBottom: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  replyAccent: {
    width: 3,
    backgroundColor: `${colors.primary}40`,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
  },
  replyContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryContainer,
    borderTopWidth: 1,
    borderTopColor: `${colors.primary}20`,
  },
  replyContextText: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: colors.primary,
  },
  commentBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: `${colors.outlineVariant}30`,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: colors.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
