import { useRef } from "react";
import { useStore } from "../store";
import { WHOLE_VIEW, WHOLE_VIEW_LABEL, type DiagramJSON } from "../types";

export function Toolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const diagrams = useStore((s) => s.diagrams);
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const addDiagram = useStore((s) => s.addDiagram);
  const renameCurrentDiagram = useStore((s) => s.renameCurrentDiagram);
  const exportJSON = useStore((s) => s.exportJSON);
  const importJSON = useStore((s) => s.importJSON);
  const reset = useStore((s) => s.reset);
  const addNode = useStore((s) => s.addNode);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const pastLen = useStore((s) => s.past.length);
  const futureLen = useStore((s) => s.future.length);
  const relayout = useStore((s) => s.relayoutCurrentView);

  const onSave = () => {
    const data = exportJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.diagram_id === WHOLE_VIEW ? "全体" : data.diagram_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as DiagramJSON;
        importJSON(data);
      } catch {
        alert("JSONのパースに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onAddDiagram = () => {
    const name = window.prompt("新規詳細図名");
    if (name) addDiagram(name);
  };

  const onRename = () => {
    if (currentView === WHOLE_VIEW) return;
    const name = window.prompt("詳細図名を変更", currentView);
    if (name && name !== currentView) renameCurrentDiagram(name);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid #ddd",
        background: "#fafafa",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, color: "#555" }}>表示中</span>
      <select
        value={currentView}
        onChange={(e) => setCurrentView(e.target.value)}
        style={{ padding: "4px 8px", width: 160 }}
      >
        {diagrams.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
        <option value={WHOLE_VIEW}>{WHOLE_VIEW_LABEL}</option>
      </select>
      <button onClick={onAddDiagram} title="新規詳細図を追加">
        ＋詳細図
      </button>
      <button
        onClick={onRename}
        disabled={currentView === WHOLE_VIEW}
        title="現在の詳細図名を変更"
      >
        名前変更
      </button>
      <span
        style={{
          width: 1,
          height: 20,
          background: "#ccc",
          margin: "0 4px",
        }}
      />
      <button
        onClick={() =>
          addNode({ x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 })
        }
      >
        ＋ノード追加
      </button>
      <button onClick={relayout} title="現在のビューを力学で再配置">
        ⚙ 自動配置
      </button>
      <button onClick={undo} disabled={pastLen === 0} title="Ctrl+Z">
        ↶ 戻す
      </button>
      <button onClick={redo} disabled={futureLen === 0} title="Ctrl+Y">
        ↷ やり直す
      </button>
      <button onClick={onSave}>JSON保存</button>
      <button onClick={() => fileRef.current?.click()}>JSON読込</button>
      <button onClick={reset}>クリア</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        onChange={onLoad}
        style={{ display: "none" }}
      />
      <span style={{ marginLeft: "auto", fontSize: 11, color: "#888" }}>
        左ドラッグ=範囲選択 / ホイール・右ドラッグ=パン / dbl-クリック=ノード追加 / Del=削除
      </span>
    </div>
  );
}
