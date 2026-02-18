
export type IQCategory = 'logical' | 'numerical' | 'verbal' | 'spatial';

export interface IQQuestion {
  id: string;
  category: IQCategory;
  question: string;
  choices: string[];
  answer: string;
  weight: number;
  explanation: string;
  svgData?: string; // 図形問題用
}

export const IQ_QUESTION_BANK: IQQuestion[] = [
  {
    id: "num-1",
    category: "numerical",
    question: "次の数列の'?'に入る数字は何ですか？\n2, 6, 12, 20, ?",
    choices: ["24", "28", "30", "32"],
    answer: "30",
    weight: 5,
    explanation: "前の数字に順に4, 6, 8, 10...と偶数を足していく規則性があります。"
  },
  {
    id: "log-1",
    category: "logical",
    question: "『すべてのAはBである。一部のBはCである。』このとき、確実に言えることは？",
    choices: ["すべてのAはCである", "一部のAはCである", "一部のCはBである", "AとCは無関係である"],
    answer: "一部のCはBである",
    weight: 7,
    explanation: "命題の逆転と包含関係の論理的推論です。"
  },
  {
    id: "ver-1",
    category: "verbal",
    question: "『太陽：地球』という関係と同じ関係にあるペアは？",
    choices: ["地球：月", "海：魚", "車：タイヤ", "本：文字"],
    answer: "地球：月",
    weight: 5,
    explanation: "主星と衛星（恒星と惑星）の公転関係を表すアナロジー問題です。"
  },
  {
    id: "spa-1",
    category: "spatial",
    question: "この図形を90度右に回転させ、裏返したものはどれですか？",
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    answer: "選択肢B",
    weight: 8,
    explanation: "空間把握能力を測定します。",
    svgData: `<svg viewBox="0 0 100 100" class="w-32 h-32 mx-auto"><rect x="20" y="20" width="40" height="40" fill="#6366f1" /><circle cx="70" cy="70" r="15" fill="#f43f5e" /></svg>`
  },
  {
    id: "num-2",
    category: "numerical",
    question: "1から100までの数字の中に、'9'はいくつ含まれますか？",
    choices: ["10", "11", "19", "20"],
    answer: "20",
    weight: 10,
    explanation: "一の位に10個、十の位に10個（90-99）存在します。"
  },
  {
    id: "log-2",
    category: "logical",
    question: "ある村で『正直者は常に真実を言い、嘘つきは常に嘘をつく』。一人の男が「私は嘘つきだ」と言った。この男は何者か？",
    choices: ["正直者", "嘘つき", "村人ではない", "このような男は存在し得ない"],
    answer: "このような男は存在し得ない",
    weight: 12,
    explanation: "自己言及のパラドックスです。正直者なら嘘を言えず、嘘つきなら真実（自分が嘘つきであること）を言えないため矛盾します。"
  }
];
