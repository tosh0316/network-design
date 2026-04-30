import { useEffect, useState } from "react";
import { generateGraphFromText } from "../ai";
import { useStore } from "../store";
import { WHOLE_VIEW } from "../types";

const API_KEY_STORAGE = "vd_gemini_api_key";

export function AIPanel() {
  const currentView = useStore((s) => s.currentView);
  const mergeFromAI = useStore((s) => s.mergeFromAI);
  const diagramId = currentView === WHOLE_VIEW ? "全体" : currentView;

  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  const [apiKey, setApiKey] = useState<string>(
    envKey ?? localStorage.getItem(API_KEY_STORAGE) ?? "",
  );
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!envKey && apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey, envKey]);

  const onGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await generateGraphFromText(text, diagramId, apiKey);
      mergeFromAI(data);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "absolute",
          right: 296,
          bottom: 16,
          padding: "6px 14px",
          background: "#1f6feb",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 10,
          fontSize: 13,
        }}
      >
        ✨ AI生成
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        right: 296,
        bottom: 16,
        width: 360,
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        zIndex: 10,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ flex: 1 }}>AI生成（Gemini）</strong>
        <button onClick={() => setOpen(false)} style={{ padding: "2px 8px" }}>
          ×
        </button>
      </div>

      {!envKey && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>
            Gemini APIキー（localStorage に保存）
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
          />
        </div>
      )}

      <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>
        関係性を日本語で説明（現在の詳細図: 「{diagramId}」に追加されます）
      </div>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="例: 施主が敷地のアカマツを切り、敷地内で乾燥させ、チョウナではつって、家の梁として使う。"
        style={{ marginBottom: 8 }}
      />

      {error && (
        <div
          style={{
            color: "#b00",
            fontSize: 11,
            marginBottom: 8,
            background: "#fee",
            padding: "4px 8px",
            borderRadius: 3,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={onGenerate}
          disabled={loading || !text.trim() || !apiKey}
          style={{
            flex: 1,
            background: loading ? "#999" : "#1f6feb",
            color: "white",
            border: "none",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "生成中..." : "ノード/エッジを生成"}
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: "#888" }}>
        既存ノードに追加されます。重複は自動マージされません
      </div>
    </div>
  );
}
