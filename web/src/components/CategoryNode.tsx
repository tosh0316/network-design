import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NetworkNode } from "../types";

const CATEGORY_FILL: Record<string, string> = {
  人: "#b97a6b",
  場所: "#5f8a7e",
  物: "#deaa79",
  道具: "#e8d582",
  行為: "#b8c99a",
};

const CATEGORY_COLOR: Record<string, string> = {
  人: "#8e5546",
  場所: "#3d6259",
  物: "#a87a47",
  道具: "#b09a4f",
  行為: "#88a06c",
};

const CATEGORY_TEXT: Record<string, string> = {
  人: "#ffffff",
  場所: "#ffffff",
  物: "#3a2e22",
  道具: "#3a2e22",
  行為: "#3a2e22",
};

export function CategoryNode({ data, selected }: NodeProps<NetworkNode>) {
  const size = 60 + data.info * 8;
  const accent = CATEGORY_COLOR[data.category] ?? "#444";
  const fill = CATEGORY_FILL[data.category] ?? "#bbbbbb";
  const textColor = CATEGORY_TEXT[data.category] ?? "#1a1a1a";
  const handleSize = 10;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: fill,
        border: "none",
        position: "relative",
        boxSizing: "border-box",
        boxShadow: selected
          ? "0 0 0 3px #1f6feb"
          : "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 120ms",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: textColor,
          padding: 6,
          pointerEvents: "none",
          wordBreak: "break-all",
          zIndex: 2,
          lineHeight: 1.15,
        }}
      >
        {data.name}
      </div>
      <Handle
        id="c"
        type="source"
        position={Position.Top}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: handleSize,
          height: handleSize,
          borderRadius: "50%",
          background: accent,
          border: "none",
          opacity: 0.55,
          cursor: "crosshair",
          zIndex: 1,
        }}
      />
    </div>
  );
}
