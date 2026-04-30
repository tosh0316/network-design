import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import type { Position } from "./types";

type SimNode = {
  id: string;
  size: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type SimLink = {
  source: string;
  target: string;
};

export type LayoutInput = {
  fixed: Array<{ id: string; size: number; position: Position }>;
  free: Array<{ id: string; size: number; initial?: Position }>;
  edges: SimLink[];
  center: Position;
};

export function forceLayout(input: LayoutInput): Map<string, Position> {
  const { fixed, free, edges, center } = input;
  if (free.length === 0) return new Map();

  const simNodes: SimNode[] = [
    ...fixed.map((n) => ({
      id: n.id,
      size: n.size,
      x: n.position.x,
      y: n.position.y,
      fx: n.position.x,
      fy: n.position.y,
    })),
    ...free.map((n, i) => {
      const angle = (i / Math.max(free.length, 1)) * Math.PI * 2;
      return {
        id: n.id,
        size: n.size,
        x: n.initial?.x ?? center.x + 60 * Math.cos(angle),
        y: n.initial?.y ?? center.y + 60 * Math.sin(angle),
      } as SimNode;
    }),
  ];

  const sim = forceSimulation<SimNode>(simNodes)
    .force("charge", forceManyBody<SimNode>().strength(-1100).distanceMax(900))
    .force(
      "collide",
      forceCollide<SimNode>().radius((d) => d.size / 2 + 32).iterations(3),
    )
    .force(
      "link",
      forceLink<SimNode, SimLink>(edges)
        .id((d) => d.id)
        .distance(260)
        .strength(0.55),
    )
    .force("center", forceCenter(center.x, center.y).strength(0.02))
    .stop();

  for (let i = 0; i < 400; i++) sim.tick();

  const out = new Map<string, Position>();
  for (const node of simNodes) {
    out.set(node.id, {
      x: node.x ?? center.x,
      y: node.y ?? center.y,
    });
  }
  return out;
}
