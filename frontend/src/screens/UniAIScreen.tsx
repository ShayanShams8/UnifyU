import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { chatWithAI } from "../api/client";
import { useCanvas } from "../context/CanvasContext";
import { colors, borderRadius } from "../theme/colors";

interface SuggestedPost {
  post_id: number;
  title: string;
  author: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggested_users?: string[];
  suggested_posts?: SuggestedPost[];
}

const SUGGESTIONS = [
  { icon: "sparkles-outline", title: "What is the SAT?", sub: "Understand US college admissions" },
  { icon: "document-text-outline", title: "How to apply for OPT?", sub: "Post-graduation work authorization" },
  { icon: "home-outline", title: "Finding student housing", sub: "Tips for moving to a new city" },
  { icon: "cash-outline", title: "Scholarships for international students", sub: "Financial aid & funding" },
];

const TOOLS = [
  { key: "currency", icon: "swap-horizontal", title: "Currency Converter", sub: "Real-time exchange rates", color: "#2563eb" },
  { key: "fundingGap", icon: "analytics-outline", title: "Funding Gap", sub: "Calculate & close your gap", color: "#7c3aed" },
  { key: "scholarships", icon: "ribbon-outline", title: "Scholarship Finder", sub: "AI-powered search", color: "#0891b2" },
  { key: "scamCheck", icon: "shield-checkmark-outline", title: "Scam Shield", sub: "Verify legitimacy", color: "#16a34a" },
  { key: "appeal", icon: "document-text-outline", title: "Appeal Copilot", sub: "Draft appeal letters", color: "#ea580c" },
  { key: "emergency", icon: "flash-outline", title: "Emergency Aid", sub: "Immediate resources", color: "#dc2626" },
  { key: "proofOfFunds", icon: "card-outline", title: "Proof of Funds", sub: "F-1/J-1 visa planning", color: "#0d9488" },
];

export default function UniAIScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const canvas = useCanvas();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [canvasMode, setCanvasMode] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatWithAI({
        message: msgText,
        history,
        active_tools: activeTools,
        canvas_mode: canvasMode,
        canvas_context: canvasMode
          ? {
              nodes: canvas.nodes.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                content: n.content,
                rows: n.rows,
              })),
              connections: canvas.connections.map((c) => ({
                id: c.id,
                from_id: c.fromId,
                to_id: c.toId,
              })),
            }
          : undefined,
      });
      // If AI returned canvas ops (edit/delete/connect), apply them
      if (res.data.canvas_ops?.ops?.length > 0) {
        canvas.applyAIOps(res.data.canvas_ops.ops);
      }
      // If AI returned new canvas nodes, add them
      if (res.data.canvas_nodes?.nodes?.length > 0) {
        canvas.addNodesFromAI(
          res.data.canvas_nodes.nodes,
          res.data.canvas_nodes.connections || []
        );
      }
      const aiMsg: Message = {
        role: "assistant",
        content: res.data.message,
        suggested_users: res.data.suggested_users,
        suggested_posts: res.data.suggested_posts,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      const errText =
        e.code === "ECONNABORTED"
          ? "Request timed out — UniAI took too long to respond. Please try again."
          : e.response?.data?.detail || "Could not reach UniAI. Check your connection.";
      const errMsg: Message = { role: "assistant", content: `⚠️ ${errText}` };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const toggleTool = (key: string) => {
    setActiveTools((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const isFirstView = messages.length === 0;
  const TAB_BAR_HEIGHT = 80;

  return (
    <SafeAreaView style={styles.container}>
      {/* Kinetic background blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>UniAI</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {activeTools.length > 0 && (
            <View style={styles.headerTools}>
              <Ionicons name="hardware-chip-outline" size={12} color={colors.primary} />
              <Text style={styles.headerToolsText}>
                {activeTools.length} tool{activeTools.length > 1 ? "s" : ""} active
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.canvasHeaderBtn, canvasMode && styles.canvasHeaderBtnActive]}
            onPress={() => setCanvasMode((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="layers-outline"
              size={15}
              color={canvasMode ? colors.primary : colors.onSurfaceVariant}
            />
            <Text style={[styles.canvasHeaderBtnText, canvasMode && styles.canvasHeaderBtnTextActive]}>
              {canvasMode ? "Canvas: ON" : "Enable integration with Canvas"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {isFirstView ? (
          <ScrollView
            contentContainerStyle={styles.welcomeScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>UnifyU</Text>
              <Text style={styles.heroSub}>
                Your sanctuary for{" "}
                <Text style={{ color: colors.primary, fontFamily: "Manrope_700Bold" }}>
                  mindful learning
                </Text>{" "}
                and{" "}
                <Text style={{ color: colors.coral, fontFamily: "Manrope_700Bold" }}>
                  academic clarity
                </Text>
                . How can I assist your educational journey today?
              </Text>
            </View>

            {/* Quick Suggestions */}
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionCard}
                  onPress={() => sendMessage(s.title)}
                  activeOpacity={0.8}
                >
                  <View style={styles.suggestionIconWrap}>
                    <Ionicons name={s.icon as any} size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.suggestionTitle}>{s.title}</Text>
                  <Text style={styles.suggestionSub}>{s.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messagesScroll}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, i) => (
              <ChatBubble key={i} message={msg} navigation={navigation} />
            ))}
            {loading && (
              <View style={styles.thinkingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.thinkingText}>UniAI is thinking...</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Active tool pills */}
        {activeTools.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolPillsRow}
            style={styles.toolPillsScroll}
          >
            {activeTools.map((key) => {
              const tool = TOOLS.find((t) => t.key === key)!;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.toolPill, { borderColor: tool.color }]}
                  onPress={() => toggleTool(key)}
                >
                  <Ionicons name={tool.icon as any} size={11} color={tool.color} />
                  <Text style={[styles.toolPillText, { color: tool.color }]}>{tool.title}</Text>
                  <Ionicons name="close" size={11} color={tool.color} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 8 }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachBtn} onPress={() => setShowToolPicker(true)}>
              <Ionicons name="add" size={22} color={colors.outline} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message UniAI..."
              placeholderTextColor={colors.outline}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDim]}
                style={styles.sendGradient}
              >
                <Ionicons name="send" size={18} color={colors.onPrimary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            UniAI can make mistakes. Verify important information.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Tool Picker Sheet */}
      <Modal
        visible={showToolPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowToolPicker(false)}
      >
        <SafeAreaView style={pickerStyles.container}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Add tools to your session</Text>
            <TouchableOpacity onPress={() => setShowToolPicker(false)} style={pickerStyles.doneBtn}>
              <Text style={pickerStyles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
          <Text style={pickerStyles.sub}>
            Active tools give UniAI specialized financial capabilities in your conversation.
          </Text>
          <ScrollView
            contentContainerStyle={pickerStyles.toolList}
            showsVerticalScrollIndicator={false}
          >
            {TOOLS.map((tool) => {
              const isActive = activeTools.includes(tool.key);
              return (
                <TouchableOpacity
                  key={tool.key}
                  style={[
                    pickerStyles.toolRow,
                    isActive && { borderColor: tool.color, borderWidth: 1.5 },
                  ]}
                  onPress={() => toggleTool(tool.key)}
                  activeOpacity={0.8}
                >
                  <View style={[pickerStyles.toolIcon, { backgroundColor: tool.color + "18" }]}>
                    <Ionicons name={tool.icon as any} size={20} color={tool.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.toolTitle}>{tool.title}</Text>
                    <Text style={pickerStyles.toolSub}>{tool.sub}</Text>
                  </View>
                  <View
                    style={[
                      pickerStyles.checkbox,
                      isActive && { backgroundColor: tool.color, borderColor: tool.color },
                    ]}
                  >
                    {isActive && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function ChatBubble({ message, navigation }: { message: Message; navigation: any }) {
  const isUser = message.role === "user";
  return (
    <View style={[bubbleStyles.row, isUser && bubbleStyles.rowUser]}>
      {!isUser && (
        <View style={bubbleStyles.aiAvatar}>
          <Ionicons name="hardware-chip-outline" size={16} color={colors.primary} />
        </View>
      )}
      <View style={{ maxWidth: "80%" }}>
        <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.userBubble : bubbleStyles.aiBubble]}>
          {isUser ? (
            <Text style={[bubbleStyles.text, bubbleStyles.userText]}>{message.content}</Text>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )}
        </View>

        {/* Suggested users — clickable chips */}
        {message.suggested_users && message.suggested_users.length > 0 && (
          <View style={bubbleStyles.suggestions}>
            <Text style={bubbleStyles.suggestLabel}>People who might help:</Text>
            {message.suggested_users.map((u) => (
              <TouchableOpacity
                key={u}
                style={bubbleStyles.userChip}
                onPress={() => navigation.navigate("UserProfile", { username: u })}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={12} color={colors.primary} />
                <Text style={bubbleStyles.userChipText}>@{u}</Text>
                <Ionicons name="chevron-forward" size={10} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Suggested blog posts — clickable chips */}
        {message.suggested_posts && message.suggested_posts.length > 0 && (
          <View style={bubbleStyles.suggestions}>
            <Text style={bubbleStyles.suggestLabel}>Related posts:</Text>
            {message.suggested_posts.map((p) => (
              <TouchableOpacity
                key={p.post_id}
                style={bubbleStyles.postChip}
                onPress={() =>
                  navigation.navigate("Blogs", {
                    screen: "PostDetail",
                    params: { postId: p.post_id },
                  })
                }
                activeOpacity={0.7}
              >
                <Ionicons name="document-text-outline" size={12} color={colors.primary} />
                <Text style={bubbleStyles.postChipText} numberOfLines={1}>
                  Post #{p.post_id} · {p.title}
                </Text>
                <Ionicons name="chevron-forward" size={10} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const markdownStyles = {
  body: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: colors.onSurface,
    lineHeight: 22,
  },
  heading1: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 20,
    color: colors.onSurface,
    marginBottom: 8,
    marginTop: 4,
  },
  heading2: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    color: colors.onSurface,
    marginBottom: 6,
    marginTop: 4,
  },
  heading3: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 4,
    marginTop: 4,
  },
  bullet_list: { marginLeft: 8 },
  ordered_list: { marginLeft: 8 },
  list_item: { marginBottom: 2 },
  code_inline: {
    fontFamily: "monospace",
    fontSize: 13,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 8,
    padding: 12,
    fontFamily: "monospace",
    fontSize: 13,
  },
  strong: { fontFamily: "Manrope_700Bold" },
  em: { fontStyle: "italic" as const },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  blobTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: `${colors.primary}0a`,
  },
  blobBottom: {
    position: "absolute",
    bottom: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: `${colors.coral}0a`,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 22,
    color: colors.primary,
    fontStyle: "italic",
    letterSpacing: -1,
  },
  headerTools: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  headerToolsText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: colors.primary },
  welcomeScroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 200 },
  heroSection: { alignItems: "center", marginBottom: 40 },
  heroTitle: {
    fontSize: 80,
    fontFamily: "Manrope_800ExtraBold",
    fontStyle: "italic",
    color: colors.onSurface,
    letterSpacing: -4,
  },
  heroSub: {
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 26,
    marginTop: 16,
    maxWidth: 320,
  },
  suggestionsGrid: { gap: 12 },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius["3xl"],
    padding: 20,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}40`,
  },
  suggestionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  suggestionTitle: { fontFamily: "Manrope_800ExtraBold", fontSize: 16, color: colors.onSurface, marginBottom: 4 },
  suggestionSub: { fontFamily: "Manrope_400Regular", fontSize: 13, color: colors.onSurfaceVariant },
  messagesScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  thinkingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius["3xl"],
    alignSelf: "flex-start",
    maxWidth: "70%",
    marginBottom: 12,
  },
  thinkingText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: colors.onSurfaceVariant },
  toolPillsScroll: { maxHeight: 40 },
  toolPillsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    paddingVertical: 4,
  },
  toolPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  toolPillText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  inputBar: { paddingHorizontal: 16, paddingTop: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: borderRadius["3xl"],
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}50`,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  attachBtn: { padding: 10 },
  canvasHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}80`,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  canvasHeaderBtnActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: `${colors.primary}50`,
  },
  canvasHeaderBtnText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  canvasHeaderBtnTextActive: { color: colors.primary },
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: colors.onSurface,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendBtn: { borderRadius: borderRadius["2xl"], overflow: "hidden" },
  sendBtnDisabled: { opacity: 0.4 },
  sendGradient: { padding: 14, justifyContent: "center", alignItems: "center" },
  disclaimer: {
    textAlign: "center",
    fontFamily: "Manrope_700Bold",
    fontSize: 9,
    color: colors.outline,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginTop: 8,
  },
});

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  rowUser: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: { borderRadius: borderRadius["3xl"], padding: 14 },
  userBubble: { backgroundColor: colors.primary },
  aiBubble: { backgroundColor: colors.surfaceContainerHigh },
  text: { fontFamily: "Manrope_400Regular", fontSize: 15, color: colors.onSurface, lineHeight: 22 },
  userText: { color: colors.onPrimary },
  suggestions: { marginTop: 8, paddingHorizontal: 4 },
  suggestLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 6 },
  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  userChipText: { fontFamily: "Manrope_700Bold", fontSize: 12, color: colors.primary },
  postChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius["2xl"],
    alignSelf: "stretch",
    marginBottom: 5,
  },
  postChipText: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: colors.primary,
  },
});

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: { fontFamily: "Manrope_800ExtraBold", fontSize: 20, color: colors.onSurface },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  doneBtnText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#fff" },
  sub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 24,
    marginBottom: 20,
    lineHeight: 20,
  },
  toolList: { paddingHorizontal: 20, gap: 10, paddingBottom: 40 },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius["2xl"],
    padding: 16,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}40`,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  toolIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  toolTitle: { fontFamily: "Manrope_700Bold", fontSize: 15, color: colors.onSurface, marginBottom: 2 },
  toolSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: colors.onSurfaceVariant },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    justifyContent: "center",
    alignItems: "center",
  },
});
