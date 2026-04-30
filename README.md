# ネットワーク詳細図ツール

素材・行為・人・場所のネットワークを直感的に編集できる、SDレビュー向けのブラウザツール。

- ノード（人・場所・物・道具・行為）と関係性をドラッグ操作で構築
- Gemini API による日本語テキストからのノード/エッジ自動生成
- 詳細図 / 全体図ビューの切り替え、力学レイアウト、JSON エクスポート/インポート

## 使い方（ホスティング版）

公開URLを開き、画面右下の「✨ AI生成」パネルに [Google AI Studio](https://aistudio.google.com/) で取得した Gemini API キーを一度貼り付けるだけで使えます（キーはブラウザの localStorage に保存）。

## ローカル開発

```bash
cd web
npm install
npm run dev   # http://localhost:5173/
```

`web/.env.example` を `.env.local` にコピーして `VITE_GEMINI_API_KEY` を埋めると、APIキー入力欄を非表示にできます。

## 静的画像生成（Python）

`generate.py` は `data/nodes.csv`, `data/edges.csv` から PNG を生成するパイプライン。

```bash
uv sync
uv run generate.py --view detail --group "工房"
uv run generate.py --view whole
```

## 技術スタック

- フロント: React + TypeScript + Vite + React Flow + Zustand
- AI: Google Gemini 2.5 Flash（クライアントサイド呼び出し、各ユーザーのキー）
- 静的生成: Python + NetworkX + Matplotlib
