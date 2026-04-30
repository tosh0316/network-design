import type { Edge, Node } from "@xyflow/react";

export const WHOLE_VIEW = "__whole__";
export const WHOLE_VIEW_LABEL = "全体表示";

export type Position = { x: number; y: number };

export type NodeData = {
  name: string;
  category: string;
  info: number;
  appears_at: number;
  groups: string[];
  positions: Record<string, Position>;
  note?: string;
};

export type EdgeStyle = "solid" | "dashed";

export type EdgeData = {
  kind: string;
  weight: number;
  formed_at: number;
  groups: string[];
  directed: boolean;
  style: EdgeStyle;
  note?: string;
};

export type NetworkNode = Node<NodeData, "category">;
export type NetworkEdge = Edge<EdgeData>;

export type DiagramJSON = {
  diagram_id: string;
  version: number;
  nodes: Array<{
    id: string;
    name: string;
    category: string;
    info: number;
    appears_at: number;
    groups: string[];
    note?: string;
    position: Position;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    kind: string;
    weight: number;
    formed_at: number;
    groups: string[];
    directed: boolean;
    style?: EdgeStyle;
    note?: string;
  }>;
};
