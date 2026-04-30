import { GoogleGenAI, Type } from "@google/genai";

export type AIGeneratedGraph = {
  nodes: Array<{
    id: string;
    name: string;
    category: "人" | "場所" | "物" | "道具" | "行為";
    info: number;
    appears_at: number;
    groups: string[];
    note?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    kind: string;
    weight: number;
    formed_at: number;
    groups: string[];
    directed: boolean;
    note?: string;
  }>;
};

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "英数字スネークケースのID（例: owner, akamatsu, site）",
          },
          name: {
            type: Type.STRING,
            description: "図に表示する日本語名",
          },
          category: {
            type: Type.STRING,
            enum: ["人", "場所", "物", "道具", "行為"],
          },
          info: {
            type: Type.INTEGER,
            description: "情報量 0-10。希少性・固有性が高いほど大きい",
          },
          appears_at: {
            type: Type.NUMBER,
            description: "出現時刻 0-10。設計プロセスのフェーズ番号",
          },
          groups: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "所属する詳細図グループ名",
          },
          note: { type: Type.STRING },
        },
        required: ["id", "name", "category", "info", "appears_at", "groups"],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: "起点ノードのid" },
          target: { type: Type.STRING, description: "終点ノードのid" },
          kind: {
            type: Type.STRING,
            description: "関係種別（伐採・乾燥場所・はつる・転化・自生など、行為や関係を表す日本語）",
          },
          weight: {
            type: Type.INTEGER,
            description: "関係の強度 1-5",
          },
          formed_at: {
            type: Type.NUMBER,
            description: "結成時刻 0-10",
          },
          groups: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          directed: {
            type: Type.BOOLEAN,
            description: "因果や転化が明確で向きが意味を持つなら true、共在・帰属・場所関係なら false",
          },
          note: { type: Type.STRING },
        },
        required: [
          "source",
          "target",
          "kind",
          "weight",
          "formed_at",
          "groups",
          "directed",
        ],
      },
    },
  },
  required: ["nodes", "edges"],
};

const SYSTEM_INSTRUCTION = `あなたは建築・SDレビュー向けのネットワーク図を設計する専門アシスタント。

このネットワーク図は青木氏・西村俊貴の研究で、「素材・行為に対する情報量とネットワークの豊かさ」を可視化するもの。
ユーザーが日本語で関係性を説明する。それをノード（物・人・場所・道具・行為）とエッジ（関係性・行為・因果）に分解する。

【ノードの設計指針】
- category: 人 / 場所 / 物 / 道具 / 行為 のいずれか
- info（情報量 0-10）: その存在の希少性・固有性・来歴の重ね合わせ。汎用的な道具なら3-5、敷地固有の素材なら8-10
- appears_at（出現時刻 0-10）: 設計・施工プロセスでこの存在が現れる相対的タイミング
- id: 英数字スネークケース（例: owner, akamatsu, site, chouna）

【エッジの設計指針】
- kind: 行為や関係性を表す具体的な日本語動詞・名詞（例: 伐採, 乾燥場所, はつる, 自生, 転化, 構造を支える, 振るう）
- weight 1-5: 関係の強度
- formed_at 0-10: そのエッジが結ばれるタイミング
- directed: 因果や転化、明確な向きがある関係なら true（例: アカマツ→梁、施主→木を伐採）。共在・帰属・場所関係なら false（例: 木と敷地、人と工房）

【重要】
- ユーザーの説明から登場する物・人・場所をすべてノードとして抽出する
- 同じ物の状態変化（立木→丸太→梁）はひとつの「結び目ノード」として扱い、変化過程は edges で表現することを優先
- ただし状態が大きく変わる場合（素材→部材など）は別ノードにし、転化を directed エッジで結ぶ
- groups は提供された詳細図名を必ず含める`;

export async function generateGraphFromText(
  text: string,
  diagramId: string,
  apiKey: string,
  model: string = "gemini-2.5-flash",
): Promise<AIGeneratedGraph> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `現在の詳細図名: "${diagramId}"
（生成するノード・エッジの groups にはこの詳細図名を含めること）

ユーザーの説明:
${text}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0.3,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Geminiから空の応答が返されました");
  return JSON.parse(raw) as AIGeneratedGraph;
}
