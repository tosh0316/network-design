import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { create } from "zustand";
import type { AIGeneratedGraph } from "./ai";
import { forceLayout } from "./layout";
import {
  WHOLE_VIEW,
  type DiagramJSON,
  type EdgeData,
  type NetworkEdge,
  type NetworkNode,
  type NodeData,
  type Position,
} from "./types";

type Selection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string }
  | null;

type Snapshot = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  diagrams: string[];
  currentView: string;
  wholePositions: Record<string, Position>;
};

const HISTORY_LIMIT = 50;

export const WHOLE_PREFIX = "whole_";

type Store = {
  diagrams: string[];
  currentView: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  selection: Selection;
  wholePositions: Record<string, Position>;

  past: Snapshot[];
  future: Snapshot[];

  setCurrentView: (view: string) => void;
  addDiagram: (name: string) => void;
  renameCurrentDiagram: (newName: string) => void;

  onNodesChange: (changes: NodeChange<NetworkNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<NetworkEdge>[]) => void;
  onConnect: (conn: Connection) => void;

  addNode: (position: Position) => void;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void;

  setSelection: (s: Selection) => void;
  deleteSelection: () => void;

  exportJSON: () => DiagramJSON;
  importJSON: (data: DiagramJSON) => void;
  mergeFromAI: (data: AIGeneratedGraph) => void;
  reset: () => void;
  relayoutCurrentView: () => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

let nodeSeq = 1;
let edgeSeq = 1;

const nextNodeId = (existing: NetworkNode[]) => {
  while (existing.some((n) => n.id === `n${nodeSeq}`)) nodeSeq += 1;
  return `n${nodeSeq++}`;
};

const nextEdgeId = (existing: NetworkEdge[]) => {
  while (existing.some((e) => e.id === `e${edgeSeq}`)) edgeSeq += 1;
  return `e${edgeSeq++}`;
};

export const isVisibleInView = (groups: string[], view: string) =>
  view === WHOLE_VIEW || groups.includes(view);

export const positionForView = (
  positions: Record<string, Position>,
  view: string,
): Position => {
  if (positions[view]) return positions[view];
  if (positions[WHOLE_VIEW]) return positions[WHOLE_VIEW];
  const fallback = Object.values(positions)[0];
  return fallback ?? { x: 0, y: 0 };
};

const nodeSize = (info: number) => 60 + info * 8;

const snapshot = (
  s: Pick<Store, "nodes" | "edges" | "diagrams" | "currentView" | "wholePositions">,
): Snapshot => ({
  nodes: s.nodes,
  edges: s.edges,
  diagrams: s.diagrams,
  currentView: s.currentView,
  wholePositions: s.wholePositions,
});

const computeWholeLayout = (
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  existing: Record<string, Position>,
): Record<string, Position> => {
  const byName = new Map<string, NetworkNode[]>();
  for (const n of nodes) {
    const key = n.data.name.trim();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(n);
  }
  const fixed: Array<{ id: string; size: number; position: Position }> = [];
  const free: Array<{ id: string; size: number; initial?: Position }> = [];
  for (const [name, group] of byName) {
    const size = nodeSize(Math.max(...group.map((n) => n.data.info)));
    if (existing[name]) {
      fixed.push({ id: name, size, position: existing[name] });
    } else {
      free.push({ id: name, size });
    }
  }
  const idToName = new Map(
    nodes.map((n) => [n.id, n.data.name.trim()] as const),
  );
  const seen = new Set<string>();
  const layoutEdges: Array<{ source: string; target: string }> = [];
  for (const e of edges) {
    const sn = idToName.get(e.source);
    const tn = idToName.get(e.target);
    if (!sn || !tn || sn === tn) continue;
    const key = `${sn}|${tn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    layoutEdges.push({ source: sn, target: tn });
  }
  const center = { x: 500, y: 360 };
  const result = forceLayout({ fixed, free, edges: layoutEdges, center });
  const next = { ...existing };
  for (const [name, pos] of result) {
    next[name] = pos;
  }
  return next;
};

export const useStore = create<Store>((set, get) => ({
  diagrams: ["工房"],
  currentView: "工房",
  nodes: [],
  edges: [],
  selection: null,
  wholePositions: {},

  past: [],
  future: [],

  pushHistory: () =>
    set((s) => ({
      past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const prev = s.past[s.past.length - 1];
      return {
        nodes: prev.nodes,
        edges: prev.edges,
        diagrams: prev.diagrams,
        currentView: prev.currentView,
        wholePositions: prev.wholePositions,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future.slice(0, HISTORY_LIMIT - 1)],
        selection: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      return {
        nodes: next.nodes,
        edges: next.edges,
        diagrams: next.diagrams,
        currentView: next.currentView,
        wholePositions: next.wholePositions,
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: s.future.slice(1),
        selection: null,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setCurrentView: (view) =>
    set((s) => {
      const next: Partial<Store> = { currentView: view, selection: null };
      if (view === WHOLE_VIEW) {
        const names = new Set(s.nodes.map((n) => n.data.name.trim()));
        const missing = [...names].some((name) => !s.wholePositions[name]);
        if (missing) {
          next.wholePositions = computeWholeLayout(
            s.nodes,
            s.edges,
            s.wholePositions,
          );
        }
      }
      return next;
    }),

  addDiagram: (name) =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed || s.diagrams.includes(trimmed)) return {};
      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        diagrams: [...s.diagrams, trimmed],
        currentView: trimmed,
      };
    }),

  renameCurrentDiagram: (newName) =>
    set((s) => {
      const trimmed = newName.trim();
      const old = s.currentView;
      if (!trimmed || old === WHOLE_VIEW || s.diagrams.includes(trimmed)) {
        return {};
      }
      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        diagrams: s.diagrams.map((d) => (d === old ? trimmed : d)),
        currentView: trimmed,
        nodes: s.nodes.map((n) => {
          const positions = { ...n.data.positions };
          if (positions[old]) {
            positions[trimmed] = positions[old];
            delete positions[old];
          }
          return {
            ...n,
            data: {
              ...n.data,
              groups: n.data.groups.map((g) => (g === old ? trimmed : g)),
              positions,
            },
          };
        }),
        edges: s.edges.map((e) =>
          e.data
            ? {
                ...e,
                data: {
                  ...e.data,
                  groups: e.data.groups.map((g) => (g === old ? trimmed : g)),
                },
              }
            : e,
        ),
      };
    }),

  onNodesChange: (changes) =>
    set((s) => {
      const view = s.currentView;

      if (view === WHOLE_VIEW) {
        const wholePositions = { ...s.wholePositions };
        const removeNames = new Set<string>();
        for (const c of changes) {
          if (c.type === "position" && c.position && c.id.startsWith(WHOLE_PREFIX)) {
            const name = c.id.slice(WHOLE_PREFIX.length);
            wholePositions[name] = { x: c.position.x, y: c.position.y };
          } else if (c.type === "remove" && c.id.startsWith(WHOLE_PREFIX)) {
            removeNames.add(c.id.slice(WHOLE_PREFIX.length));
          }
        }
        if (removeNames.size === 0) return { wholePositions };
        const removeIds = new Set(
          s.nodes
            .filter((n) => removeNames.has(n.data.name.trim()))
            .map((n) => n.id),
        );
        return {
          wholePositions,
          nodes: s.nodes.filter((n) => !removeIds.has(n.id)),
          edges: s.edges.filter(
            (e) => !removeIds.has(e.source) && !removeIds.has(e.target),
          ),
        };
      }

      const displayed = s.nodes
        .filter((n) => isVisibleInView(n.data.groups, view))
        .map((n) => ({ ...n, position: positionForView(n.data.positions, view) }));
      const after = applyNodeChanges<NetworkNode>(changes, displayed);
      const afterMap = new Map(after.map((n) => [n.id, n]));
      const removed = new Set(
        changes
          .filter((c): c is NodeChange & { type: "remove"; id: string } => c.type === "remove")
          .map((c) => c.id),
      );

      const updated: NetworkNode[] = [];
      for (const n of s.nodes) {
        if (removed.has(n.id)) continue;
        const cur = afterMap.get(n.id);
        if (!cur) {
          updated.push(n);
          continue;
        }
        const newPos = cur.position;
        const positionsChanged =
          newPos &&
          (newPos.x !== n.data.positions[view]?.x ||
            newPos.y !== n.data.positions[view]?.y);
        updated.push({
          ...n,
          ...cur,
          data: {
            ...n.data,
            positions: positionsChanged
              ? { ...n.data.positions, [view]: { x: newPos.x, y: newPos.y } }
              : n.data.positions,
          },
        });
      }
      return { nodes: updated };
    }),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (conn) =>
    set((s) => {
      const id = nextEdgeId(s.edges);
      const view = s.currentView;
      const groups = view === WHOLE_VIEW ? [] : [view];
      const newEdge: NetworkEdge = {
        id,
        source: conn.source,
        target: conn.target,
        sourceHandle: "c",
        targetHandle: "c",
        type: "center",
        label: "",
        data: {
          kind: "",
          weight: 1,
          formed_at: 0,
          groups,
          directed: false,
          style: "solid",
        },
      };
      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        edges: addEdge(newEdge, s.edges),
      };
    }),

  addNode: (position) =>
    set((s) => {
      const id = nextNodeId(s.nodes);
      const view = s.currentView;
      const groups = view === WHOLE_VIEW ? [] : [view];
      const positions: Record<string, Position> = { [view]: position };
      const node: NetworkNode = {
        id,
        type: "category",
        position,
        data: {
          name: id,
          category: "物",
          info: 5,
          appears_at: 0,
          groups,
          positions,
        },
      };
      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        nodes: [...s.nodes, node],
        selection: { type: "node", id },
      };
    }),

  updateNodeData: (id, patch) =>
    set((s) => ({
      past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
      future: [],
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    })),

  updateEdgeData: (id, patch) =>
    set((s) => ({
      past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
      future: [],
      edges: s.edges.map((e) => {
        if (e.id !== id) return e;
        const data: EdgeData = {
          kind: e.data?.kind ?? "",
          weight: e.data?.weight ?? 1,
          formed_at: e.data?.formed_at ?? 0,
          groups: e.data?.groups ?? [],
          directed: e.data?.directed ?? false,
          style: e.data?.style ?? "solid",
          note: e.data?.note,
          ...patch,
        };
        return {
          ...e,
          data,
          label: data.kind || "",
          markerEnd: data.directed
            ? { type: MarkerType.ArrowClosed }
            : undefined,
        };
      }),
    })),

  setSelection: (selection) => set({ selection }),

  deleteSelection: () =>
    set((s) => {
      const removeNodeIds = new Set<string>(
        s.nodes.filter((n) => n.selected).map((n) => n.id),
      );
      const removeEdgeIds = new Set<string>(
        s.edges.filter((e) => e.selected).map((e) => e.id),
      );
      if (s.selection?.type === "node") removeNodeIds.add(s.selection.id);
      if (s.selection?.type === "edge") removeEdgeIds.add(s.selection.id);

      if (removeNodeIds.size === 0 && removeEdgeIds.size === 0) return {};

      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        nodes: s.nodes.filter((n) => !removeNodeIds.has(n.id)),
        edges: s.edges.filter(
          (e) =>
            !removeEdgeIds.has(e.id) &&
            !removeNodeIds.has(e.source) &&
            !removeNodeIds.has(e.target),
        ),
        selection: null,
      };
    }),

  exportJSON: () => {
    const s = get();
    const view = s.currentView;
    const visibleNodes = s.nodes.filter((n) =>
      isVisibleInView(n.data.groups, view),
    );
    const visibleEdges = s.edges.filter((e) =>
      isVisibleInView(e.data?.groups ?? [], view),
    );
    return {
      diagram_id: view,
      version: 1,
      nodes: visibleNodes.map((n) => ({
        id: n.id,
        name: n.data.name,
        category: n.data.category,
        info: n.data.info,
        appears_at: n.data.appears_at,
        groups: n.data.groups,
        note: n.data.note,
        position: positionForView(n.data.positions, view),
      })),
      edges: visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        kind: e.data?.kind ?? "",
        weight: e.data?.weight ?? 1,
        formed_at: e.data?.formed_at ?? 0,
        groups: e.data?.groups ?? [],
        directed: e.data?.directed ?? false,
        style: e.data?.style ?? "solid",
        note: e.data?.note,
      })),
    };
  },

  importJSON: (data) =>
    set((s) => {
      const view = data.diagram_id;
      const nodes: NetworkNode[] = data.nodes.map((n) => ({
        id: n.id,
        type: "category",
        position: n.position,
        data: {
          name: n.name,
          category: n.category,
          info: n.info,
          appears_at: n.appears_at,
          groups: n.groups,
          positions: { [view]: n.position },
          note: n.note,
        },
      }));
      const edges: NetworkEdge[] = data.edges.map((e) => {
        const directed = e.directed ?? false;
        const style = e.style ?? "solid";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: "c",
          targetHandle: "c",
          type: "center",
          label: e.kind,
          markerEnd: directed ? { type: MarkerType.ArrowClosed } : undefined,
          data: {
            kind: e.kind,
            weight: e.weight,
            formed_at: e.formed_at,
            groups: e.groups,
            directed,
            style,
            note: e.note,
          },
        };
      });
      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        diagrams: s.diagrams.includes(view) ? s.diagrams : [...s.diagrams, view],
        currentView: view,
        nodes,
        edges,
        selection: null,
      };
    }),

  mergeFromAI: (data) =>
    set((s) => {
      const view = s.currentView;

      const idMap: Record<string, string> = {};
      const placeholderIds: string[] = [];
      data.nodes.forEach((n) => {
        const newId = nextNodeId([
          ...s.nodes,
          ...placeholderIds.map((id) => ({ id }) as NetworkNode),
        ]);
        idMap[n.id] = newId;
        placeholderIds.push(newId);
      });

      // Build force layout input
      const visibleExisting = s.nodes.filter((n) =>
        isVisibleInView(n.data.groups, view),
      );
      const fixed = visibleExisting.map((n) => ({
        id: n.id,
        size: nodeSize(n.data.info),
        position: positionForView(n.data.positions, view),
      }));
      const free = data.nodes.map((n) => ({
        id: idMap[n.id],
        size: nodeSize(n.info),
      }));

      const visibleIdSet = new Set([
        ...visibleExisting.map((n) => n.id),
        ...placeholderIds,
      ]);
      const layoutEdges: { source: string; target: string }[] = [];
      for (const e of s.edges) {
        if (visibleIdSet.has(e.source) && visibleIdSet.has(e.target)) {
          layoutEdges.push({ source: e.source, target: e.target });
        }
      }
      for (const e of data.edges) {
        const s2 = idMap[e.source];
        const t2 = idMap[e.target];
        if (s2 && t2) layoutEdges.push({ source: s2, target: t2 });
      }

      const center =
        fixed.length > 0
          ? {
              x: fixed.reduce((a, n) => a + n.position.x, 0) / fixed.length,
              y: fixed.reduce((a, n) => a + n.position.y, 0) / fixed.length,
            }
          : { x: 400, y: 300 };

      const positionMap = forceLayout({ fixed, free, edges: layoutEdges, center });

      const newNodes: NetworkNode[] = data.nodes.map((n) => {
        const newId = idMap[n.id];
        const pos = positionMap.get(newId) ?? center;
        return {
          id: newId,
          type: "category",
          position: pos,
          data: {
            name: n.name,
            category: n.category,
            info: n.info,
            appears_at: n.appears_at,
            groups:
              n.groups.length > 0 ? n.groups : view === WHOLE_VIEW ? [] : [view],
            positions: { [view]: pos },
            note: n.note,
          },
        };
      });

      const newEdges: NetworkEdge[] = [];
      for (const e of data.edges) {
        const source = idMap[e.source];
        const target = idMap[e.target];
        if (!source || !target) continue;
        const id = nextEdgeId([...s.edges, ...newEdges]);
        newEdges.push({
          id,
          source,
          target,
          sourceHandle: "c",
          targetHandle: "c",
          type: "center",
          label: e.kind,
          markerEnd: e.directed ? { type: MarkerType.ArrowClosed } : undefined,
          data: {
            kind: e.kind,
            weight: e.weight,
            formed_at: e.formed_at,
            groups:
              e.groups.length > 0 ? e.groups : view === WHOLE_VIEW ? [] : [view],
            directed: e.directed,
            style: "solid",
            note: e.note,
          },
        });
      }

      return {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [],
        nodes: [...s.nodes, ...newNodes],
        edges: [...s.edges, ...newEdges],
      };
    }),

  reset: () =>
    set((s) => ({
      past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
      future: [],
      nodes: [],
      edges: [],
      wholePositions: {},
      selection: null,
    })),

  relayoutCurrentView: () =>
    set((s) => {
      const view = s.currentView;
      const base = {
        past: [...s.past.slice(-(HISTORY_LIMIT - 1)), snapshot(s)],
        future: [] as Snapshot[],
      };
      if (view === WHOLE_VIEW) {
        return {
          ...base,
          wholePositions: computeWholeLayout(s.nodes, s.edges, {}),
        };
      }
      const visible = s.nodes.filter((n) =>
        isVisibleInView(n.data.groups, view),
      );
      const visibleIds = new Set(visible.map((n) => n.id));
      const free = visible.map((n) => ({
        id: n.id,
        size: nodeSize(n.data.info),
      }));
      const layoutEdges = s.edges
        .filter(
          (e) =>
            isVisibleInView(e.data?.groups ?? [], view) &&
            visibleIds.has(e.source) &&
            visibleIds.has(e.target),
        )
        .map((e) => ({ source: e.source, target: e.target }));
      const center = { x: 500, y: 360 };
      const positionMap = forceLayout({
        fixed: [],
        free,
        edges: layoutEdges,
        center,
      });
      return {
        ...base,
        nodes: s.nodes.map((n) => {
          const pos = positionMap.get(n.id);
          if (!pos) return n;
          return {
            ...n,
            data: {
              ...n.data,
              positions: { ...n.data.positions, [view]: pos },
            },
          };
        }),
      };
    }),
}));
