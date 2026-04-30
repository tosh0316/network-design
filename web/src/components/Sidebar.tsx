import { useStore } from "../store";

const CATEGORIES = ["人", "場所", "物", "道具", "行為"];

export function Sidebar() {
  const selection = useStore((s) => s.selection);
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const updateEdgeData = useStore((s) => s.updateEdgeData);

  const wrap: React.CSSProperties = {
    width: 280,
    borderLeft: "1px solid #ddd",
    padding: 16,
    background: "#fafafa",
    overflowY: "auto",
    fontSize: 13,
  };

  if (!selection) {
    return (
      <div style={wrap}>
        <div style={{ color: "#888" }}>
          ノード/エッジを選択するとプロパティを編集できます
        </div>
        <hr />
        <div>ノード数: {nodes.length}</div>
        <div>エッジ数: {edges.length}</div>
      </div>
    );
  }

  if (selection.type === "node") {
    if (selection.id.startsWith("whole_")) {
      const name = selection.id.slice(6);
      const matches = nodes.filter((n) => n.data.name.trim() === name);
      return (
        <div style={wrap}>
          <h3 style={{ marginTop: 0 }}>マージノード: {name}</h3>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 8 }}>
            全体表示で同名ノードを統合中（編集は各詳細図に切り替えてから）
          </div>
          <div style={{ marginBottom: 8 }}>登場する詳細図:</div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {[...new Set(matches.flatMap((n) => n.data.groups))].map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <hr />
          <div style={{ fontSize: 11, color: "#888" }}>
            元ノード数: {matches.length}件
          </div>
        </div>
      );
    }
    const node = nodes.find((n) => n.id === selection.id);
    if (!node) return <div style={wrap}>選択ノードが見つかりません</div>;
    const d = node.data;
    return (
      <div style={wrap}>
        <h3 style={{ marginTop: 0 }}>ノード: {node.id}</h3>
        <Field label="表示名">
          <input
            value={d.name}
            onChange={(e) => updateNodeData(node.id, { name: e.target.value })}
          />
        </Field>
        <Field label="カテゴリ">
          <select
            value={d.category}
            onChange={(e) =>
              updateNodeData(node.id, { category: e.target.value })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="情報量 (0-10)">
          <input
            type="number"
            min={0}
            max={10}
            value={d.info}
            onChange={(e) =>
              updateNodeData(node.id, { info: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="出現時刻">
          <input
            type="number"
            step="0.1"
            value={d.appears_at}
            onChange={(e) =>
              updateNodeData(node.id, { appears_at: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="詳細図グループ (カンマ区切り)">
          <input
            value={d.groups.join(", ")}
            onChange={(e) =>
              updateNodeData(node.id, {
                groups: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="備考">
          <textarea
            rows={2}
            value={d.note ?? ""}
            onChange={(e) => updateNodeData(node.id, { note: e.target.value })}
          />
        </Field>
      </div>
    );
  }

  if (selection.id.startsWith("whole_")) {
    return (
      <div style={wrap}>
        <h3 style={{ marginTop: 0 }}>マージエッジ</h3>
        <div style={{ color: "#666", fontSize: 12 }}>
          全体表示で同名ノード間のエッジを統合中（編集は各詳細図に切り替えてから）
        </div>
      </div>
    );
  }
  const edge = edges.find((e) => e.id === selection.id);
  if (!edge) return <div style={wrap}>選択エッジが見つかりません</div>;
  const ed = edge.data!;
  return (
    <div style={wrap}>
      <h3 style={{ marginTop: 0 }}>エッジ: {edge.id}</h3>
      <div style={{ color: "#888", fontSize: 12 }}>
        {edge.source} → {edge.target}
      </div>
      <Field label="関係種別">
        <input
          value={ed.kind}
          onChange={(e) => updateEdgeData(edge.id, { kind: e.target.value })}
        />
      </Field>
      <Field label="向き">
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={ed.directed}
            onChange={(e) =>
              updateEdgeData(edge.id, { directed: e.target.checked })
            }
          />
          <span>矢印を表示（方向あり）</span>
        </label>
      </Field>
      <Field label="線スタイル">
        <select
          value={ed.style ?? "solid"}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              style: e.target.value as "solid" | "dashed",
            })
          }
        >
          <option value="solid">実線（通常の関係）</option>
          <option value="dashed">点線（否定・代替・架空のルート）</option>
        </select>
      </Field>
      <Field label="強度 (1-5)">
        <input
          type="number"
          min={1}
          max={5}
          value={ed.weight}
          onChange={(e) =>
            updateEdgeData(edge.id, { weight: Number(e.target.value) })
          }
        />
      </Field>
      <Field label="結成時刻">
        <input
          type="number"
          step="0.1"
          value={ed.formed_at}
          onChange={(e) =>
            updateEdgeData(edge.id, { formed_at: Number(e.target.value) })
          }
        />
      </Field>
      <Field label="詳細図グループ (カンマ区切り)">
        <input
          value={ed.groups.join(", ")}
          onChange={(e) =>
            updateEdgeData(edge.id, {
              groups: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <Field label="備考">
        <textarea
          rows={2}
          value={ed.note ?? ""}
          onChange={(e) => updateEdgeData(edge.id, { note: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  );
}
