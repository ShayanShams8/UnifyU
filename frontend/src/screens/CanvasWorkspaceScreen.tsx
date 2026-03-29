import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import {
  useCanvas,
  CanvasNode,
  CanvasConnection,
  NodeType,
  CANVAS_SIZE,
  CANVAS_ORIGIN,
} from "../context/CanvasContext";
import { colors, borderRadius } from "../theme/colors";

const { width: SW, height: SH } = Dimensions.get("window");
const TAB_BAR_HEIGHT = 80;

// ── Node visual dimensions ────────────────────────────────────────────────────

const NODE_W: Record<NodeType, number> = { note: 180, concept: 190, table: 220 };
const NODE_H: Record<NodeType, number> = { note: 130, concept: 70, table: 80 };

function getNodeDimensions(node: CanvasNode) {
  const w = NODE_W[node.type];
  let h = NODE_H[node.type];
  if (node.type === "table") h = 48 + Math.max(1, (node.rows || []).length) * 26;
  if (node.type === "concept" && node.content && node.content !== "Tap to edit...") h = 90;
  return { w, h };
}

function getNodeCenter(node: CanvasNode) {
  const { w, h } = getNodeDimensions(node);
  return { cx: node.x + w / 2, cy: node.y + h / 2 };
}

const NODE_BG: Record<NodeType, string> = {
  note: "#fefce8",
  concept: "#eff6ff",
  table: "#f0fdf4",
};
const NODE_ACCENT: Record<NodeType, string> = {
  note: "#eab308",
  concept: "#2563eb",
  table: "#16a34a",
};
const NODE_ICON: Record<NodeType, string> = {
  note: "create-outline",
  concept: "bulb-outline",
  table: "grid-outline",
};

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Dot Grid ──────────────────────────────────────────────────────────────────

const TILE = 150;
const TILE_COUNT = 20;

function DotGrid() {
  const offset = CANVAS_ORIGIN - (TILE * TILE_COUNT) / 2;
  const tiles = [];
  for (let r = 0; r < TILE_COUNT; r++) {
    for (let c = 0; c < TILE_COUNT; c++) {
      tiles.push(
        <View
          key={`${r}-${c}`}
          style={{
            position: "absolute",
            width: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: "#cbd5e1",
            left: offset + c * TILE,
            top: offset + r * TILE,
          }}
        />
      );
    }
  }
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {tiles}
    </View>
  );
}

// ── Connection Line ───────────────────────────────────────────────────────────

function ConnectionLine({
  connection,
  fromNode,
  toNode,
  onDelete,
}: {
  connection: CanvasConnection;
  fromNode: CanvasNode;
  toNode: CanvasNode;
  onDelete: () => void;
}) {
  const { cx: x1, cy: y1 } = getNodeCenter(fromNode);
  const { cx: x2, cy: y2 } = getNodeCenter(toNode);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 1) return null;

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Double-tap on midpoint dot to delete
  const deleteTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(400)
    .maxDistance(20)
    .onStart(() => runOnJS(onDelete)());

  return (
    <>
      {/* Line */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: midX - length / 2,
          top: midY - 1,
          width: length,
          height: 2,
          backgroundColor: `${colors.primary}55`,
          transform: [{ rotate: `${angle}deg` }],
          borderRadius: 1,
        }}
      />
      {/* Double-tap zone at midpoint */}
      <GestureDetector gesture={deleteTap}>
        <View
          style={{
            position: "absolute",
            left: midX - 14,
            top: midY - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: `${colors.primary}15`,
            borderWidth: 1,
            borderColor: `${colors.primary}30`,
            zIndex: 4,
          }}
        />
      </GestureDetector>
    </>
  );
}

// ── Connection Dot (edge handle) ──────────────────────────────────────────────

function ConnectionDot({
  side,
  nodeW,
  nodeH,
  onPress,
}: {
  side: "top" | "bottom" | "left" | "right";
  nodeW: number;
  nodeH: number;
  onPress: () => void;
}) {
  const pos = {
    top: { left: nodeW / 2 - 8, top: -10 },
    bottom: { left: nodeW / 2 - 8, top: nodeH + 2 },
    left: { left: -10, top: nodeH / 2 - 8 },
    right: { left: nodeW + 2, top: nodeH / 2 - 8 },
  }[side];

  return (
    <TouchableOpacity
      style={[styles.connectionDot, pos]}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    />
  );
}

// ── Canvas Workspace Screen ───────────────────────────────────────────────────

export default function CanvasWorkspaceScreen() {
  const canvas = useCanvas();
  const [editNode, setEditNode] = useState<CanvasNode | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Canvas viewport transform
  const offsetX = useSharedValue(-CANVAS_ORIGIN + SW / 2);
  const offsetY = useSharedValue(-CANVAS_ORIGIN + SH / 2 - TAB_BAR_HEIGHT / 2);
  const savedOffX = useSharedValue(offsetX.value);
  const savedOffY = useSharedValue(offsetY.value);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const canvasPanRef = useRef<any>(null);
  const canvasPinchRef = useRef<any>(null);

  const canvasPan = Gesture.Pan()
    .withRef(canvasPanRef)
    .onBegin(() => {
      savedOffX.value = offsetX.value;
      savedOffY.value = offsetY.value;
    })
    .onUpdate((e) => {
      offsetX.value = savedOffX.value + e.translationX;
      offsetY.value = savedOffY.value + e.translationY;
    });

  const canvasPinch = Gesture.Pinch()
    .withRef(canvasPinchRef)
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(next, 0.25), 3.5);
    });

  const canvasGesture = Gesture.Simultaneous(canvasPan, canvasPinch);

  const canvasAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  const resetView = () => {
    offsetX.value = withSpring(-CANVAS_ORIGIN + SW / 2);
    offsetY.value = withSpring(-CANVAS_ORIGIN + SH / 2 - TAB_BAR_HEIGHT / 2);
    scale.value = withSpring(1);
  };

  const zoomIn = () => {
    scale.value = withSpring(Math.min(scale.value * 1.4, 3.5));
  };

  const zoomOut = () => {
    scale.value = withSpring(Math.max(scale.value / 1.4, 0.25));
  };

  const addNode = (type: NodeType) => {
    setShowAddMenu(false);
    const cx = (-offsetX.value + SW / 2) / scale.value;
    const cy = (-offsetY.value + SH / 2) / scale.value;
    const w = NODE_W[type];
    const h = NODE_H[type];
    canvas.addNode({
      type,
      x: cx - w / 2,
      y: cy - h / 2,
      title: type === "note" ? "New Note" : type === "concept" ? "New Concept" : "New Table",
      content: type === "table" ? "" : "Tap to edit...",
      rows: type === "table" ? [{ key: "Item", value: "Value" }] : undefined,
    });
  };

  // Node single-tap: select, deselect, or complete connection
  const handleNodeSingleTap = useCallback(
    (node: CanvasNode) => {
      if (connectingFromId) {
        if (connectingFromId !== node.id) {
          canvas.addConnection(connectingFromId, node.id);
        }
        setConnectingFromId(null);
        setSelectedNodeId(null);
        return;
      }
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [connectingFromId, canvas]
  );

  // Node double-tap: open edit modal
  const handleNodeDoubleTap = useCallback(
    (node: CanvasNode) => {
      setSelectedNodeId(null);
      setConnectingFromId(null);
      setEditNode({ ...node });
    },
    []
  );

  // Connection dot tap: start connecting from this node
  const handleStartConnect = useCallback((nodeId: string) => {
    setSelectedNodeId(null);
    setConnectingFromId(nodeId);
  }, []);

  const cancelConnect = () => {
    setConnectingFromId(null);
    setSelectedNodeId(null);
  };

  if (canvas.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const nodeMap = new Map(canvas.nodes.map((n) => [n.id, n]));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Workspace</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={zoomOut}>
            <Ionicons name="remove-outline" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={zoomIn}>
            <Ionicons name="add-outline" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={resetView}>
            <Ionicons name="locate-outline" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHelp(true)}>
            <Ionicons name="help-circle-outline" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Connect mode banner */}
      {connectingFromId && (
        <View style={styles.connectBanner}>
          <Ionicons name="git-branch-outline" size={14} color={colors.primary} />
          <Text style={styles.connectBannerText}>Tap another node to connect</Text>
          <TouchableOpacity onPress={cancelConnect} style={styles.connectCancelBtn}>
            <Text style={styles.connectCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Canvas */}
      <View style={styles.canvasViewport}>
        <GestureDetector gesture={canvasGesture}>
          <Animated.View style={[styles.canvas, canvasAnimStyle]}>
            <DotGrid />

            {/* Empty state */}
            {canvas.nodes.length === 0 && (
              <View
                style={{
                  position: "absolute",
                  left: CANVAS_ORIGIN - 120,
                  top: CANVAS_ORIGIN - 20,
                  width: 240,
                  alignItems: "center",
                }}
              >
                <Text style={styles.emptyHintText}>Your infinite workspace</Text>
                <Text style={styles.emptyHintSub}>Tap + to add a note, concept, or table</Text>
              </View>
            )}

            {/* Connection lines (below nodes) */}
            {canvas.connections.map((conn) => {
              const from = nodeMap.get(conn.fromId);
              const to = nodeMap.get(conn.toId);
              if (!from || !to) return null;
              return (
                <ConnectionLine
                  key={conn.id}
                  connection={conn}
                  fromNode={from}
                  toNode={to}
                  onDelete={() => canvas.deleteConnection(conn.id)}
                />
              );
            })}

            {/* Nodes */}
            {canvas.nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                canvasPanRef={canvasPanRef}
                canvasPinchRef={canvasPinchRef}
                isSelected={selectedNodeId === node.id}
                isConnecting={connectingFromId === node.id}
                isConnectTarget={connectingFromId !== null && connectingFromId !== node.id}
                onSingleTap={() => handleNodeSingleTap(node)}
                onDoubleTap={() => handleNodeDoubleTap(node)}
                onStartConnect={() => handleStartConnect(node.id)}
                onPositionChange={(x, y) => canvas.updateNode(node.id, { x, y })}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </View>

      {/* FAB */}
      <View style={[styles.fabWrap, { bottom: TAB_BAR_HEIGHT + 20 }]}>
        {showAddMenu && (
          <View style={styles.addMenu}>
            {(["note", "concept", "table"] as NodeType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.addMenuBtn, { backgroundColor: NODE_BG[type] }]}
                onPress={() => addNode(type)}
              >
                <Ionicons name={NODE_ICON[type] as any} size={18} color={NODE_ACCENT[type]} />
                <Text style={[styles.addMenuText, { color: NODE_ACCENT[type] }]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddMenu((v) => !v)}
          activeOpacity={0.85}
        >
          <Ionicons name={showAddMenu ? "close" : "add"} size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      {editNode && (
        <NodeEditModal
          node={editNode}
          onSave={(updated) => {
            canvas.updateNode(updated.id, updated);
            setEditNode(null);
          }}
          onDelete={() => {
            canvas.deleteNode(editNode.id);
            setEditNode(null);
          }}
          onClose={() => setEditNode(null)}
        />
      )}

      {/* Help Modal */}
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
    </SafeAreaView>
  );
}

// ── Node Card ─────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: CanvasNode;
  canvasPanRef: React.MutableRefObject<any>;
  canvasPinchRef: React.MutableRefObject<any>;
  isSelected: boolean;
  isConnecting: boolean;
  isConnectTarget: boolean;
  onSingleTap: () => void;
  onDoubleTap: () => void;
  onStartConnect: () => void;
  onPositionChange: (x: number, y: number) => void;
}

function NodeCard({
  node,
  canvasPanRef,
  canvasPinchRef,
  isSelected,
  isConnecting,
  isConnectTarget,
  onSingleTap,
  onDoubleTap,
  onStartConnect,
  onPositionChange,
}: NodeCardProps) {
  const nodeX = useSharedValue(node.x);
  const nodeY = useSharedValue(node.y);
  const savedNX = useSharedValue(node.x);
  const savedNY = useSharedValue(node.y);
  const isActive = useSharedValue(false);

  // Timer for distinguishing single vs double tap in JS
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTapGesture = useCallback(() => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      onDoubleTap();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        onSingleTap();
      }, 280);
    }
  }, [onSingleTap, onDoubleTap]);

  // Keep shared values in sync when position changes externally (AI batch)
  React.useEffect(() => {
    nodeX.value = node.x;
    nodeY.value = node.y;
  }, [node.x, node.y]);

  const nodePan = Gesture.Pan()
    .blocksExternalGesture(canvasPanRef, canvasPinchRef)
    .onBegin(() => {
      savedNX.value = nodeX.value;
      savedNY.value = nodeY.value;
      isActive.value = true;
    })
    .onUpdate((e) => {
      nodeX.value = savedNX.value + e.translationX;
      nodeY.value = savedNY.value + e.translationY;
    })
    .onEnd(() => {
      isActive.value = false;
      runOnJS(onPositionChange)(nodeX.value, nodeY.value);
    });

  const nodeTap = Gesture.Tap()
    .maxDuration(250)
    .maxDistance(8)
    .onStart(() => runOnJS(handleTapGesture)());

  const composed = Gesture.Exclusive(nodePan, nodeTap);

  const nodeAnimStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: nodeX.value,
    top: nodeY.value,
    transform: [{ scale: isActive.value ? 1.04 : 1 }],
    zIndex: isActive.value ? 10 : 2,
  }));

  const { w, h } = getNodeDimensions(node);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          nodeAnimStyle,
          isConnecting && styles.nodeHighlight,
          isConnectTarget && styles.nodeConnectTarget,
        ]}
      >
        {node.type === "note" && <NoteCard node={node} />}
        {node.type === "concept" && <ConceptCard node={node} />}
        {node.type === "table" && <TableCard node={node} />}

        {/* Connection dots — shown when selected */}
        {isSelected && !isConnecting && (
          <>
            {(["top", "bottom", "left", "right"] as const).map((side) => (
              <ConnectionDot
                key={side}
                side={side}
                nodeW={w}
                nodeH={h}
                onPress={onStartConnect}
              />
            ))}
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({ node }: { node: CanvasNode }) {
  return (
    <View style={nodeStyles.noteCard}>
      <View style={nodeStyles.noteHeader}>
        <Text style={nodeStyles.noteTitle} numberOfLines={1}>{node.title}</Text>
        <Ionicons name="create-outline" size={14} color="#a16207" />
      </View>
      <Text style={nodeStyles.noteContent} numberOfLines={5}>{node.content}</Text>
    </View>
  );
}

// ── Concept Card ──────────────────────────────────────────────────────────────

function ConceptCard({ node }: { node: CanvasNode }) {
  return (
    <View style={nodeStyles.conceptCard}>
      <View style={nodeStyles.conceptAccent} />
      <View style={nodeStyles.conceptBody}>
        <Ionicons name="bulb-outline" size={14} color={colors.primary} />
        <Text style={nodeStyles.conceptTitle} numberOfLines={1}>{node.title}</Text>
      </View>
      {!!node.content && node.content !== "Tap to edit..." && (
        <Text style={nodeStyles.conceptContent} numberOfLines={2}>{node.content}</Text>
      )}
    </View>
  );
}

// ── Table Card ────────────────────────────────────────────────────────────────

function TableCard({ node }: { node: CanvasNode }) {
  return (
    <View style={nodeStyles.tableCard}>
      <View style={nodeStyles.tableHeader}>
        <Ionicons name="grid-outline" size={13} color="#16a34a" />
        <Text style={nodeStyles.tableTitle} numberOfLines={1}>{node.title}</Text>
      </View>
      {(node.rows || []).map((row, i) => (
        <View key={i} style={[nodeStyles.tableRow, i > 0 && nodeStyles.tableRowBorder]}>
          <Text style={nodeStyles.tableKey} numberOfLines={1}>{row.key}</Text>
          <Text style={nodeStyles.tableValue} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Node Edit Modal ───────────────────────────────────────────────────────────

function NodeEditModal({
  node,
  onSave,
  onDelete,
  onClose,
}: {
  node: CanvasNode;
  onSave: (n: CanvasNode) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CanvasNode>({ ...node });

  const updateRow = (i: number, field: "key" | "value", val: string) => {
    const rows = [...(draft.rows || [])];
    rows[i] = { ...rows[i], [field]: val };
    setDraft((d) => ({ ...d, rows }));
  };

  const addRow = () => {
    setDraft((d) => ({ ...d, rows: [...(d.rows || []), { key: "", value: "" }] }));
  };

  const removeRow = (i: number) => {
    const rows = (draft.rows || []).filter((_, idx) => idx !== i);
    setDraft((d) => ({ ...d, rows }));
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete node?",
      `"${node.title}" and its connections will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={editStyles.container}>
        <View style={editStyles.header}>
          <TouchableOpacity onPress={onClose} style={editStyles.cancelBtn}>
            <Text style={editStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={[editStyles.typeTag, { backgroundColor: NODE_BG[node.type] }]}>
            <Ionicons name={NODE_ICON[node.type] as any} size={13} color={NODE_ACCENT[node.type]} />
            <Text style={[editStyles.typeText, { color: NODE_ACCENT[node.type] }]}>
              {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
            </Text>
          </View>
          <View style={editStyles.headerRight}>
            <TouchableOpacity onPress={confirmDelete} style={editStyles.deleteBtn}>
              <Ionicons name="trash-outline" size={15} color={colors.error} />
              <Text style={editStyles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(draft)} style={editStyles.saveBtn}>
              <Text style={editStyles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={editStyles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={editStyles.label}>Title</Text>
          <TextInput
            style={editStyles.titleInput}
            value={draft.title}
            onChangeText={(t) => setDraft((d) => ({ ...d, title: t }))}
            placeholder="Node title"
            placeholderTextColor={colors.outline}
          />

          {node.type !== "table" && (
            <>
              <Text style={editStyles.label}>Content</Text>
              <TextInput
                style={editStyles.contentInput}
                value={draft.content}
                onChangeText={(t) => setDraft((d) => ({ ...d, content: t }))}
                placeholder="Write something..."
                placeholderTextColor={colors.outline}
                multiline
                textAlignVertical="top"
              />
            </>
          )}

          {node.type === "table" && (
            <>
              <Text style={editStyles.label}>Rows</Text>
              {(draft.rows || []).map((row, i) => (
                <View key={i} style={editStyles.rowEdit}>
                  <TextInput
                    style={[editStyles.rowInput, { flex: 1 }]}
                    value={row.key}
                    onChangeText={(v) => updateRow(i, "key", v)}
                    placeholder="Label"
                    placeholderTextColor={colors.outline}
                  />
                  <TextInput
                    style={[editStyles.rowInput, { flex: 1 }]}
                    value={row.value}
                    onChangeText={(v) => updateRow(i, "value", v)}
                    placeholder="Value"
                    placeholderTextColor={colors.outline}
                  />
                  <TouchableOpacity onPress={() => removeRow(i)} style={editStyles.rowDelete}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={editStyles.addRowBtn} onPress={addRow}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={editStyles.addRowText}>Add Row</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Help Modal ────────────────────────────────────────────────────────────────

function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tips = [
    { icon: "hand-left-outline", text: "Drag to pan the canvas. Pinch to zoom." },
    { icon: "finger-print-outline", text: "Tap a node once to show connection handles on each side." },
    { icon: "git-branch-outline", text: "Tap a connection handle, then tap another node to link them." },
    { icon: "create-outline", text: "Double-tap a node to edit its content or delete it." },
    { icon: "remove-circle-outline", text: "Double-tap on a connection line's midpoint dot to remove it." },
    { icon: "sparkles-outline", text: "Enable Canvas Mode in UniAI to let the AI build your workspace automatically." },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={helpStyles.overlay}>
        <View style={helpStyles.sheet}>
          <View style={helpStyles.header}>
            <Text style={helpStyles.title}>How to use Canvas</Text>
            <TouchableOpacity onPress={onClose} style={helpStyles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
          {tips.map((tip, i) => (
            <View key={i} style={helpStyles.tipRow}>
              <View style={helpStyles.tipIcon}>
                <Ionicons name={tip.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={helpStyles.tipText}>{tip.text}</Text>
            </View>
          ))}
          <TouchableOpacity style={helpStyles.gotItBtn} onPress={onClose}>
            <Text style={helpStyles.gotItText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerTitle: { fontFamily: "Manrope_800ExtraBold", fontSize: 22, color: colors.onSurface },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  connectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius["2xl"],
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  connectBannerText: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 13,
    color: colors.primary,
  },
  connectCancelBtn: { paddingHorizontal: 4 },
  connectCancelText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: colors.primary },
  canvasViewport: { flex: 1, overflow: "hidden" },
  canvas: { width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: "#f8fafc" },
  emptyHintText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 16,
    color: colors.outlineVariant,
    textAlign: "center",
  },
  emptyHintSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: colors.outlineVariant,
    marginTop: 4,
    textAlign: "center",
  },
  nodeHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl + 2,
  },
  nodeConnectTarget: {
    opacity: 0.6,
  },
  connectionDot: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${colors.primary}30`,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  fabWrap: { position: "absolute", right: 20, alignItems: "flex-end", gap: 8 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addMenu: { gap: 8, alignItems: "flex-end", marginBottom: 4 },
  addMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius["2xl"],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addMenuText: { fontFamily: "Manrope_700Bold", fontSize: 14 },
});

const nodeStyles = StyleSheet.create({
  noteCard: {
    width: 180,
    minHeight: 120,
    backgroundColor: "#fefce8",
    borderRadius: borderRadius.xl,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderTopWidth: 3,
    borderTopColor: "#facc15",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noteTitle: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#713f12", flex: 1 },
  noteContent: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: "#92400e",
    lineHeight: 18,
  },
  conceptCard: {
    minWidth: 160,
    maxWidth: 220,
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  conceptAccent: { height: 4, backgroundColor: colors.primary },
  conceptBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  conceptTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 13,
    color: colors.onSurface,
    flex: 1,
  },
  conceptContent: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 12,
    paddingBottom: 10,
    lineHeight: 17,
  },
  tableCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#16a34a",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
  },
  tableTitle: { fontFamily: "Manrope_700Bold", fontSize: 13, color: "#14532d", flex: 1 },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: "#dcfce7" },
  tableKey: {
    flex: 1,
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#166534",
  },
  tableValue: {
    flex: 1,
    fontFamily: "Manrope_400Regular",
    fontSize: 11,
    color: colors.onSurface,
    textAlign: "right",
  },
});

const editStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}40`,
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 2, minWidth: 56 },
  cancelText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: colors.onSurfaceVariant },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  typeText: { fontFamily: "Manrope_700Bold", fontSize: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.error}40`,
  },
  deleteBtnText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: colors.error },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  saveText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#fff" },
  body: { padding: 20, gap: 6, paddingBottom: 60 },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  titleInput: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 18,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}40`,
  },
  contentInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    minHeight: 120,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}40`,
  },
  rowEdit: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  rowInput: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: `${colors.outlineVariant}40`,
  },
  rowDelete: { padding: 8 },
  addRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    borderStyle: "dashed",
    alignSelf: "flex-start",
    marginTop: 4,
  },
  addRowText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: colors.primary },
});

const helpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontFamily: "Manrope_800ExtraBold", fontSize: 20, color: colors.onSurface },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.outlineVariant}30`,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
    paddingTop: 8,
  },
  gotItBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  gotItText: { fontFamily: "Manrope_700Bold", fontSize: 16, color: "#fff" },
});
