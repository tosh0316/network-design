import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MarkerType, SelectionMode } from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  isVisibleInView,
  positionForView,
  useStore,
  WHOLE_PREFIX,
} from "../store";
import { WHOLE_VIEW } from "../types";
import type { NetworkEdge, NetworkNode } from "../types";
import { CategoryNode } from "./CategoryNode";
import { CenterEdge } from "./CenterEdge";

const nodeTypes = { category: CategoryNode };
const edgeTypes = { center: CenterEdge };

export function DiagramCanvas() {
  const allNodes = useStore((s) => s.nodes);
  const allEdges = useStore((s) => s.edges);
  const currentView = useStore((s) => s.currentView);
  const wholePositions = useStore((s) => s.wholePositions);

  const nodes = useMemo<NetworkNode[]>(() => {
    if (currentView === WHOLE_VIEW) {
      const byName = new Map<string, NetworkNode[]>();
      for (const n of allNodes) {
        const key = n.data.name.trim();
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key)!.push(n);
      }
      const result: NetworkNode[] = [];
      for (const [name, group] of byName) {
        const first = group[0];
        const allGroups = [
          ...new Set(group.flatMap((n) => n.data.groups)),
        ];
        const maxInfo = Math.max(...group.map((n) => n.data.info));
        const pos = wholePositions[name] ?? { x: 0, y: 0 };
        result.push({
          id: `${WHOLE_PREFIX}${name}`,
          type: "category",
          position: pos,
          data: {
            name,
            category: first.data.category,
            info: maxInfo,
            appears_at: first.data.appears_at,
            groups: allGroups,
            positions: { [WHOLE_VIEW]: pos },
            note: first.data.note,
          },
        });
      }
      return result;
    }
    return allNodes
      .filter((n) => isVisibleInView(n.data.groups, currentView))
      .map((n) => ({
        ...n,
        position: positionForView(n.data.positions, currentView),
      }));
  }, [allNodes, currentView, wholePositions]);

  const edges = useMemo<NetworkEdge[]>(() => {
    if (currentView === WHOLE_VIEW) {
      const idToName = new Map(
        allNodes.map((n) => [n.id, n.data.name.trim()] as const),
      );
      const seen = new Map<string, NetworkEdge>();
      for (const e of allEdges) {
        const sn = idToName.get(e.source);
        const tn = idToName.get(e.target);
        if (!sn || !tn || sn === tn) continue;
        const key = `${sn}|${tn}|${e.data?.kind ?? ""}|${e.data?.directed ? "d" : "u"}`;
        if (seen.has(key)) continue;
        seen.set(key, {
          ...e,
          id: `${WHOLE_PREFIX}${e.id}`,
          source: `${WHOLE_PREFIX}${sn}`,
          target: `${WHOLE_PREFIX}${tn}`,
          sourceHandle: "c",
          targetHandle: "c",
          markerEnd: e.data?.directed
            ? { type: MarkerType.ArrowClosed }
            : undefined,
        });
      }
      return [...seen.values()];
    }
    const visibleIds = new Set(nodes.map((n) => n.id));
    return allEdges.filter(
      (e) =>
        isVisibleInView(e.data?.groups ?? [], currentView) &&
        visibleIds.has(e.source) &&
        visibleIds.has(e.target),
    );
  }, [allEdges, allNodes, currentView, nodes]);

  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const addNode = useStore((s) => s.addNode);
  const setSelection = useStore((s) => s.setSelection);
  const deleteSelection = useStore((s) => s.deleteSelection);
  const pushHistory = useStore((s) => s.pushHistory);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  const flowRef = useRef<ReactFlowInstance<NetworkNode> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      flowRef.current?.fitView({ duration: 350, padding: 0.2 });
    }, 80);
    return () => window.clearTimeout(id);
  }, [currentView]);

  useEffect(() => {
    const isInEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isInEditable(e.target)) return;
        deleteSelection();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "z" || e.key === "Z")) {
        if (isInEditable(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        if (isInEditable(e.target)) return;
        e.preventDefault();
        redo();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection, undo, redo]);

  const onWrapperDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!flowRef.current) return;
      const target = event.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      const position = flowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(position);
    },
    [addNode],
  );

  return (
    <div
      ref={wrapperRef}
      style={{ flex: 1, height: "100%" }}
      onDoubleClick={onWrapperDoubleClick}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(inst) =>
          (flowRef.current = inst as ReactFlowInstance<NetworkNode>)
        }
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => pushHistory()}
        onNodeClick={(_, n: Node) => setSelection({ type: "node", id: n.id })}
        onEdgeClick={(_, e: Edge) => setSelection({ type: "edge", id: e.id })}
        onPaneClick={() => setSelection(null)}
        zoomOnDoubleClick={false}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: "center" }}
        panOnDrag={[1, 2]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        fitView
        deleteKeyCode={null}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
