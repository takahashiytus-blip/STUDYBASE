
import { GoogleGenAI, Type } from "@google/genai";

// クライアントサイドでの連続呼び出し防止用（1.5秒間隔）
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 1500;

const waitForCooldown = async () => {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLastCall));
  }
  lastCallTime = Date.now();
};

const extractJson = (text: string) => {
  try {
    let jsonStr = text.trim();
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("AI JSON Parse Error:", e, "Raw Text:", text);
    throw new Error("AIデータの解析に失敗しました。もう一度生成してください。");
  }
};

const handleApiError = (error: any) => {
  console.error("Gemini API Error details:", error);
  const message = error?.message || "";
  if (message.includes("429") || message.includes("quota") || message.includes("limit")) {
    return new Error("AIの利用制限に達しました。1分ほど待ってから再試行してください。安定した利用にはAPIの有料枠設定を推奨します。");
  }
  return new Error("AI通信エラーが発生しました。インターネット接続を確認してください。");
};

// 報告書生成（Liteモデル）
export const generateProfessionalReport = async (
  studentName: string,
  subject: string,
  rawNotes: string,
  homeworkAssigned: string,
  attendanceStatus: string,
  quizScore?: number,
  homeworkCompletion?: number
) => {
  await waitForCooldown();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const attendanceLabel = attendanceStatus === 'present' ? '出席' : attendanceStatus === 'late' ? '遅刻' : '当日欠席';
  const completionLabel = homeworkCompletion !== undefined ? `${homeworkCompletion}%` : "未入力";

  const prompt = `
    プロの塾講師として保護者向けの報告書をJSONで生成してください。
    生徒:${studentName} 科目:${subject} 出欠:${attendanceLabel} 宿題:${completionLabel} メモ:${rawNotes} 次回宿題:${homeworkAssigned}

    【重要制約】
    weeklyPlanは必ず「1日目：[内容]」「2日目：[内容]」...「7日目：[内容]」という、7日間分の日割り形式で出力してください。
    改行は \\n を使用してください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lessonSummary: { type: Type.STRING },
            studentPerformance: { type: Type.STRING },
            homeworkStatus: { type: Type.STRING },
            nextSteps: { type: Type.STRING },
            weeklyPlan: { type: Type.STRING },
            messageToParents: { type: Type.STRING }
          },
          required: ["lessonSummary", "studentPerformance", "homeworkStatus", "nextSteps", "weeklyPlan", "messageToParents"]
        }
      },
    });
    return extractJson(response.text || "{}");
  } catch (error) {
    throw handleApiError(error);
  }
};

// 単語クイズ（Liteモデル - 予備として維持）
export const generateWordQuiz = async (grade: string) => {
  try {
    await waitForCooldown();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `${grade}レベルの英単語10問。JSON形式。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { word: { type: Type.STRING }, choices: { type: Type.ARRAY, items: { type: Type.STRING } }, answer: { type: Type.STRING } },
            required: ["word", "choices", "answer"]
          }
        }
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (e) { return []; }
};

// ニックネームバリデーション（Liteモデル）
export const validateDisplayName = async (name: string): Promise<{ isValid: boolean; reason?: string }> => {
  try {
    await waitForCooldown();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `名前「${name}」の適切性判定。JSON。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { isValid: { type: Type.BOOLEAN }, reason: { type: Type.STRING } },
          required: ["isValid"]
        }
      }
    });
    return extractJson(response.text || "{\"isValid\": true}");
  } catch (e) { return { isValid: true }; }
};

// 面談資料作成（Liteモデル）
export const generateInterviewMaterial = async (
  studentName: string,
  grade: string,
  reports: any[],
  exams: any[],
  location: string,
  targetSchool?: string,
  targetFaculty?: string
) => {
  await waitForCooldown();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `塾の面談用戦略資料をJSONで作成。生徒:${studentName} 学年:${grade} 地域:${location} 志望:${targetSchool || '未設定'}\n報告書要約:${JSON.stringify(reports.map(r => r.generatedContent.lessonSummary))}\n模試:${JSON.stringify(exams)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            growthPoints: { type: Type.STRING },
            challenges: { type: Type.STRING },
            futureStrategy: { type: Type.STRING },
            suggestedSchools: {
              type: Type.OBJECT,
              properties: {
                public: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, realistic: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["challenge", "realistic"] },
                private: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, solid: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["challenge", "solid"] }
              },
              required: ["public", "private"]
            },
            requiredStudyHours: {
              type: Type.OBJECT,
              properties: {
                totalWeekly: { type: Type.NUMBER },
                subjectBreakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, priorityReason: { type: Type.STRING }, hours: { type: Type.NUMBER } }, required: ["subject", "priorityReason", "hours"] } }
              },
              required: ["totalWeekly", "subjectBreakdown"]
            },
            parentAdvice: { type: Type.STRING }
          },
          required: ["growthPoints", "challenges", "futureStrategy", "suggestedSchools", "requiredStudyHours", "parentAdvice"]
        }
      }
    });
    return extractJson(response.text || "{}");
  } catch (error) {
    throw handleApiError(error);
  }
};
