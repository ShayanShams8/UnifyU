import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { getCanvas, saveCanvas } from "../api/client";

// ── Types (exported so CanvasWorkspaceScreen can import them) ─────────────────

export type NodeType = "note" | "concept" | "table";

export interface TableRow {
  key: string;
  value: string;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  title: string;
  content: string;
  rows?: TableRow[];
}

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface AICanvasNode {
  type: string;
  title: string;
  content?: string;
  rows?: TableRow[];
}

export interface AICanvasConnection {
  from_index: number;
  to_index: number;
}

export interface AICanvasOp {
  op: "add" | "edit" | "delete" | "connect" | "disconnect";
  // add
  type?: string;
  title?: string;
  content?: string;
  rows?: TableRow[];
  // edit / delete
  id?: string;
  // connect / disconnect
  from_id?: string;
  to_id?: string;
}

interface CanvasContextValue {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  isLoading: boolean;
  addNode: (node: Omit<CanvasNode, "id">) => string;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  addConnection: (fromId: string, toId: string) => string;
  deleteConnection: (id: string) => void;
  deleteConnectionsForNode: (nodeId: string) => void;
  addNodesFromAI: (rawNodes: AICanvasNode[], rawConns: AICanvasConnection[]) => void;
  applyAIOps: (ops: AICanvasOp[]) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const CANVAS_SIZE = 6000;
export const CANVAS_ORIGIN = CANVAS_SIZE / 2;

const INITIAL_NODES: CanvasNode[] = [
  {
    id: "welcome",
    type: "note",
    x: CANVAS_ORIGIN - 90,
    y: CANVAS_ORIGIN - 100,
    title: "Welcome!",
    content:
      "This is your infinite workspace.\nDrag to pan, pinch to zoom.\nDouble-tap any node to edit.",
  },
  {
    id: "concept1",
    type: "concept",
    x: CANVAS_ORIGIN + 130,
    y: CANVAS_ORIGIN + 20,
    title: "OPT Timeline",
    content: "Apply 90 days before graduation",
  },
  {
    id: "table1",
    type: "table",
    x: CANVAS_ORIGIN - 220,
    y: CANVAS_ORIGIN + 100,
    title: "Cost Breakdown",
    content: "",
    rows: [
      { key: "Tuition", value: "$18,000" },
      { key: "Housing", value: "$9,600" },
      { key: "Food", value: "$4,200" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Context ───────────────────────────────────────────────────────────────────

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const { student } = useAuth();
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connections, setConnections] = useState<CanvasConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextAIYRef = useRef(CANVAS_ORIGIN + 350);

  // ── Persistence ─────────────────────────────────────────────────────────────

  const debouncedSave = useCallback(
    (latestNodes: CanvasNode[], latestConns: CanvasConnection[]) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveCanvas({
            nodes_json: JSON.stringify(latestNodes),
            connections_json: JSON.stringify(latestConns),
          });
        } catch {
          // silent fail — canvas data will be saved on next interaction
        }
      }, 1500);
    },
    []
  );

  // Load canvas when user logs in
  useEffect(() => {
    if (!student) {
      hasLoadedRef.current = false;
      setNodes([]);
      setConnections([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await getCanvas();
        if (cancelled) return;
        const savedNodes: CanvasNode[] = JSON.parse(res.data.nodes_json);
        const savedConns: CanvasConnection[] = JSON.parse(res.data.connections_json);
        setNodes(res.data.has_saved ? savedNodes : INITIAL_NODES);
        setConnections(savedConns);
        if (savedNodes.length > 0) {
          const maxY = Math.max(...savedNodes.map((n) => n.y));
          nextAIYRef.current = maxY + 300;
        }
      } catch {
        if (!cancelled) setNodes(INITIAL_NODES);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [student?.id]);

  // Auto-save whenever nodes or connections change (skip initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    debouncedSave(nodes, connections);
  }, [nodes, connections, debouncedSave]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addNode = useCallback((node: Omit<CanvasNode, "id">): string => {
    const id = makeId();
    setNodes((prev) => [...prev, { ...node, id }]);
    return id;
  }, []);

  const updateNode = useCallback(
    (id: string, updates: Partial<CanvasNode>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      );
    },
    []
  );

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== id && c.toId !== id)
    );
  }, []);

  const addConnection = useCallback(
    (fromId: string, toId: string): string => {
      const id = makeId();
      setConnections((prev) => {
        const exists = prev.some(
          (c) =>
            (c.fromId === fromId && c.toId === toId) ||
            (c.fromId === toId && c.toId === fromId)
        );
        if (exists) return prev;
        return [...prev, { id, fromId, toId }];
      });
      return id;
    },
    []
  );

  const deleteConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const deleteConnectionsForNode = useCallback((nodeId: string) => {
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== nodeId && c.toId !== nodeId)
    );
  }, []);

  // ── AI Canvas Integration ────────────────────────────────────────────────────

  const addNodesFromAI = useCallback(
    (rawNodes: AICanvasNode[], rawConns: AICanvasConnection[]) => {
      if (rawNodes.length === 0) return;

      const COLS = 3;
      const COL_SPACING = 280;
      const ROW_SPACING = 210;

      const colCount = Math.min(rawNodes.length, COLS);
      const rowCount = Math.ceil(rawNodes.length / COLS);
      const startX = CANVAS_ORIGIN - ((colCount - 1) * COL_SPACING) / 2;
      const batchY = nextAIYRef.current;

      const newIds: string[] = [];
      const newNodes: CanvasNode[] = rawNodes.map((raw, i) => {
        const id = makeId();
        newIds.push(id);
        return {
          id,
          type: (raw.type as NodeType) || "note",
          x: startX + (i % COLS) * COL_SPACING,
          y: batchY + Math.floor(i / COLS) * ROW_SPACING,
          title: raw.title || "Untitled",
          content: raw.content || "",
          rows: raw.rows,
        };
      });

      const newConns: CanvasConnection[] = rawConns
        .filter(
          (c) =>
            c.from_index >= 0 &&
            c.from_index < newIds.length &&
            c.to_index >= 0 &&
            c.to_index < newIds.length &&
            c.from_index !== c.to_index
        )
        .map((c) => ({
          id: makeId(),
          fromId: newIds[c.from_index],
          toId: newIds[c.to_index],
        }));

      nextAIYRef.current = batchY + rowCount * ROW_SPACING + 100;

      setNodes((prev) => [...prev, ...newNodes]);
      setConnections((prev) => [...prev, ...newConns]);
    },
    []
  );

  // ── AI Ops (edit / delete / connect / disconnect existing + add new) ──────────

  const applyAIOps = useCallback(
    (ops: AICanvasOp[]) => {
      if (ops.length === 0) return;

      // Batch all 'add' ops together for tidy grid placement
      const addOps = ops.filter((op) => op.op === "add");
      if (addOps.length > 0) {
        const COLS = 3;
        const COL_SPACING = 280;
        const ROW_SPACING = 210;
        const colCount = Math.min(addOps.length, COLS);
        const rowCount = Math.ceil(addOps.length / COLS);
        const startX = CANVAS_ORIGIN - ((colCount - 1) * COL_SPACING) / 2;
        const batchY = nextAIYRef.current;
        const newNodes: CanvasNode[] = addOps.map((op, i) => ({
          id: makeId(),
          type: (op.type as NodeType) || "note",
          x: startX + (i % COLS) * COL_SPACING,
          y: batchY + Math.floor(i / COLS) * ROW_SPACING,
          title: op.title || "Untitled",
          content: op.content || "",
          rows: op.rows,
        }));
        nextAIYRef.current = batchY + rowCount * ROW_SPACING + 100;
        setNodes((prev) => [...prev, ...newNodes]);
      }

      // Process mutations in order
      ops.forEach((op) => {
        switch (op.op) {
          case "edit":
            if (op.id) {
              const updates: Partial<CanvasNode> = {};
              if (op.title !== undefined) updates.title = op.title;
              if (op.content !== undefined) updates.content = op.content;
              if (op.rows !== undefined) updates.rows = op.rows;
              setNodes((prev) =>
                prev.map((n) => (n.id === op.id ? { ...n, ...updates } : n))
              );
            }
            break;
          case "delete":
            if (op.id) {
              setNodes((prev) => prev.filter((n) => n.id !== op.id));
              setConnections((prev) =>
                prev.filter((c) => c.fromId !== op.id && c.toId !== op.id)
              );
            }
            break;
          case "connect":
            if (op.from_id && op.to_id && op.from_id !== op.to_id) {
              setConnections((prev) => {
                const exists = prev.some(
                  (c) =>
                    (c.fromId === op.from_id && c.toId === op.to_id) ||
                    (c.fromId === op.to_id && c.toId === op.from_id)
                );
                if (exists) return prev;
                return [
                  ...prev,
                  { id: makeId(), fromId: op.from_id!, toId: op.to_id! },
                ];
              });
            }
            break;
          case "disconnect":
            if (op.from_id && op.to_id) {
              setConnections((prev) =>
                prev.filter(
                  (c) =>
                    !(
                      (c.fromId === op.from_id && c.toId === op.to_id) ||
                      (c.fromId === op.to_id && c.toId === op.from_id)
                    )
                )
              );
            }
            break;
        }
      });
    },
    []
  );

  return (
    <CanvasContext.Provider
      value={{
        nodes,
        connections,
        isLoading,
        addNode,
        updateNode,
        deleteNode,
        addConnection,
        deleteConnection,
        deleteConnectionsForNode,
        addNodesFromAI,
        applyAIOps,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasContext);
  if (!ctx) throw new Error("useCanvas must be used inside CanvasProvider");
  return ctx;
}
