import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "../theme/colors";
import { formatDistanceToNow } from "../utils/time";

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

interface PostCardProps {
  post: Post;
  currentUserId?: number;
  isAdmin?: boolean;
  onLike: () => void;
  onDelete: () => void;
  onPress: () => void;
}

export default function PostCard({ post, currentUserId, isAdmin, onLike, onDelete, onPress }: PostCardProps) {
  const [showIdModal, setShowIdModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const isOwner = currentUserId === post.author;
  const canDelete = isOwner || isAdmin;

  const handleThreeDot = () => {
    if (Platform.OS === "ios") {
      const options = ["View Post ID", canDelete ? "Delete Post" : null, "Cancel"].filter(Boolean) as string[];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: canDelete ? 1 : undefined },
        (idx) => {
          if (idx === 0) setShowIdModal(true);
          else if (idx === 1 && canDelete) onDelete();
        }
      );
    } else {
      setShowOptions(true);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.avatarWrap}>
          {post.author_pfp ? (
            <Image source={{ uri: post.author_pfp }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>
            {post.isAnonymous ? "Anonymous" : (post.author_name || post.author_username || "Unknown")}
          </Text>
          <Text style={styles.authorTime}>
            {post.isAnonymous ? "" : (post.author_username ? `@${post.author_username} • ` : "")}
            {formatDistanceToNow(post.created_at)}
          </Text>
        </View>
        <TouchableOpacity style={styles.threeDot} onPress={handleThreeDot} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.outline} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
      <Text style={styles.content} numberOfLines={5}>{post.content}</Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Ionicons
            name={post.liked_by_me ? "heart" : "heart-outline"}
            size={20}
            color={post.liked_by_me ? "#ef4444" : colors.onSurfaceVariant}
          />
          <Text style={[styles.actionCount, post.liked_by_me && { color: "#ef4444" }]}>
            {post.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.actionCount}>{post.comment_count}</Text>
        </TouchableOpacity>
      </View>

      {/* Post ID Modal */}
      <Modal visible={showIdModal} transparent animationType="fade">
        <TouchableOpacity style={idStyles.overlay} onPress={() => setShowIdModal(false)} activeOpacity={1}>
          <View style={idStyles.box}>
            <Text style={idStyles.label}>Post ID</Text>
            <Text style={idStyles.id}>#{post.id}</Text>
            <Text style={idStyles.hint}>Share this ID with admins to report issues</Text>
            <TouchableOpacity style={idStyles.closeBtn} onPress={() => setShowIdModal(false)}>
              <Text style={idStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Sheet (web/Android) */}
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <TouchableOpacity style={optStyles.overlay} onPress={() => setShowOptions(false)} activeOpacity={1}>
          <View style={optStyles.sheet}>
            <TouchableOpacity style={optStyles.option} onPress={() => { setShowOptions(false); setShowIdModal(true); }}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={optStyles.optionText}>View Post ID</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={optStyles.option} onPress={() => { setShowOptions(false); onDelete(); }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[optStyles.optionText, { color: colors.error }]}>Delete Post</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["4xl"],
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatarWrap: {},
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primaryContainer },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: { fontFamily: "Manrope_700Bold", fontSize: 15, color: colors.onSurface },
  authorTime: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 },
  threeDot: { padding: 4 },
  title: { fontFamily: "Manrope_800ExtraBold", fontSize: 20, color: colors.onSurface, marginBottom: 8, lineHeight: 26 },
  content: { fontFamily: "Manrope_400Regular", fontSize: 15, color: colors.onSurfaceVariant, lineHeight: 22, marginBottom: 16 },
  actions: { flexDirection: "row", gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${colors.outlineVariant}30` },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontFamily: "Manrope_700Bold", fontSize: 13, color: colors.onSurfaceVariant },
});

const idStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  box: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["3xl"],
    padding: 32,
    alignItems: "center",
    width: 280,
  },
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  id: { fontFamily: "Manrope_800ExtraBold", fontSize: 40, color: colors.primary, marginBottom: 8 },
  hint: { fontFamily: "Manrope_400Regular", fontSize: 13, color: colors.onSurfaceVariant, textAlign: "center", marginBottom: 20 },
  closeBtn: { backgroundColor: colors.primaryContainer, paddingHorizontal: 24, paddingVertical: 10, borderRadius: borderRadius.full },
  closeBtnText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: colors.primary },
});

const optStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius["3xl"],
    borderTopRightRadius: borderRadius["3xl"],
    paddingVertical: 8,
    paddingBottom: 32,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  optionText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: colors.onSurface },
});
