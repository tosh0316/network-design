import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeData } from "../types";

export function CenterEdge(props: EdgeProps) {
  const { id, source, target, markerEnd, label, selected, data } = props;
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const sw = sourceNode.measured?.width ?? 0;
  const sh = sourceNode.measured?.height ?? 0;
  const tw = targetNode.measured?.width ?? 0;
  const th = targetNode.measured?.height ?? 0;

  const sxCenter = sourceNode.internals.positionAbsolute.x + sw / 2;
  const syCenter = sourceNode.internals.positionAbsolute.y + sh / 2;
  const txCenter = targetNode.internals.positionAbsolute.x + tw / 2;
  const tyCenter = targetNode.internals.positionAbsolute.y + th / 2;

  let targetX = txCenter;
  let targetY = tyCenter;

  if (markerEnd) {
    const dx = txCenter - sxCenter;
    const dy = tyCenter - syCenter;
    const dist = Math.hypot(dx, dy) || 1;
    const radius = Math.min(tw, th) / 2;
    targetX = txCenter - (dx / dist) * radius;
    targetY = tyCenter - (dy / dist) * radius;
  }

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: sxCenter,
    sourceY: syCenter,
    targetX,
    targetY,
  });

  const edgeData = data as EdgeData | undefined;
  const dashed = edgeData?.style === "dashed";
  const weight = edgeData?.weight ?? 1;
  const baseWidth = 1.4 + weight * 0.35;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          strokeWidth: selected ? baseWidth + 1 : baseWidth,
          stroke: selected ? "#1f6feb" : "#5a5a5a",
          strokeDasharray: dashed ? "8 6" : undefined,
          opacity: dashed ? 0.6 : 0.9,
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 12,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 2,
              background: "#fff",
              border: "1px solid #5a5a5a",
              color: "#1a1a1a",
              letterSpacing: "0.02em",
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {label as React.ReactNode}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
