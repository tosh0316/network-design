"""SDレビュー用ネットワーク図生成スクリプト。

スプシからエクスポートした nodes.csv / edges.csv を読み込み、
3つのビュー（詳細図 / 空間的全体図 / 時間軸図）を出力する。

Usage:
    uv run generate.py --view detail --group "曲がった木"
    uv run generate.py --view whole
    uv run generate.py --view timeaxis
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
from matplotlib import font_manager

for candidate in ("Yu Gothic", "Meiryo", "MS Gothic", "Noto Sans CJK JP"):
    if any(f.name == candidate for f in font_manager.fontManager.ttflist):
        matplotlib.rcParams["font.family"] = candidate
        break
matplotlib.rcParams["axes.unicode_minus"] = False

ROOT = Path(__file__).parent
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "output"
OUT_DIR.mkdir(exist_ok=True)


def _split_groups(value) -> list[str]:
    if pd.isna(value) or value == "":
        return []
    return [s.strip() for s in str(value).split(",") if s.strip()]


def load_graph() -> nx.MultiDiGraph:
    nodes = pd.read_csv(DATA_DIR / "nodes.csv")
    edges = pd.read_csv(DATA_DIR / "edges.csv")

    G = nx.MultiDiGraph()
    for _, r in nodes.iterrows():
        G.add_node(
            r["id"],
            name=r.get("name", r["id"]),
            category=r.get("category"),
            info=float(r["情報量"]) if pd.notna(r.get("情報量")) else 0.0,
            appears_at=r.get("出現時刻"),
            groups=_split_groups(r.get("詳細図グループ")),
        )
    for _, r in edges.iterrows():
        G.add_edge(
            r["from"],
            r["to"],
            kind=r.get("関係種別"),
            weight=float(r["強度"]) if pd.notna(r.get("強度")) else 1.0,
            formed_at=r.get("結成時刻"),
            groups=_split_groups(r.get("詳細図グループ")),
        )
    return G


def filter_by_group(G: nx.MultiDiGraph, group: str) -> nx.MultiDiGraph:
    keep = [n for n, d in G.nodes(data=True) if group in d.get("groups", [])]
    return G.subgraph(keep).copy()


def _node_sizes(G, base: int = 300, scale: int = 250) -> list[int]:
    return [base + scale * G.nodes[n].get("info", 0) for n in G.nodes]


def _node_labels(G) -> dict:
    return {n: G.nodes[n].get("name", n) for n in G.nodes}


def render_detail(G: nx.MultiDiGraph, group: str, out: Path) -> None:
    sub = filter_by_group(G, group)
    if sub.number_of_nodes() == 0:
        raise SystemExit(f"グループ '{group}' に該当ノードがありません")
    pos = nx.spring_layout(sub, seed=42)
    plt.figure(figsize=(8, 8))
    nx.draw(
        sub, pos,
        node_size=_node_sizes(sub),
        labels=_node_labels(sub),
        with_labels=True,
        font_family=matplotlib.rcParams["font.family"][0],
    )
    plt.title(f"ネットワーク詳細図: {group}")
    plt.savefig(out, dpi=200, bbox_inches="tight")
    plt.close()


def render_whole(G: nx.MultiDiGraph, out: Path) -> None:
    pos = nx.spring_layout(G, seed=42, k=0.6)
    plt.figure(figsize=(12, 10))
    nx.draw(
        G, pos,
        node_size=_node_sizes(G, base=200, scale=200),
        labels=_node_labels(G),
        with_labels=True,
        font_family=matplotlib.rcParams["font.family"][0],
        alpha=0.8,
    )
    plt.title("空間的ネットワーク（全体）")
    plt.savefig(out, dpi=200, bbox_inches="tight")
    plt.close()


def render_timeaxis(G: nx.MultiDiGraph, out: Path) -> None:
    """TODO: 横軸 = 対数時間（出現時刻）、縦軸 = カテゴリ で配置。"""
    raise NotImplementedError("時間軸レイアウト未実装")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--view", choices=["detail", "whole", "timeaxis"], required=True)
    p.add_argument("--group", help="detail view のみ：詳細図グループ名")
    args = p.parse_args()

    G = load_graph()

    if args.view == "detail":
        if not args.group:
            raise SystemExit("--group is required for detail view")
        slug = re.sub(r"[^\w\-]+", "_", args.group, flags=re.UNICODE).strip("_")
        out = OUT_DIR / f"detail_{slug}.png"
        render_detail(G, args.group, out)
    elif args.view == "whole":
        out = OUT_DIR / "whole.png"
        render_whole(G, out)
    else:
        out = OUT_DIR / "timeaxis.png"
        render_timeaxis(G, out)

    print(f"Wrote: {out}")


if __name__ == "__main__":
    main()
