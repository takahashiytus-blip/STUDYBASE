
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJson = (text: string) => {
  try {
    let jsonStr = text.trim();
    // マークダウンのコードブロックを除去
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    // JSONの開始と終了を探す
    const firstBracket = jsonStr.indexOf('[');
    const firstBrace = jsonStr.indexOf('{');
    let targetJson = jsonStr;
    
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket !== -1) targetJson = jsonStr.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1) {
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1) targetJson = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    // 文字列内の改行コードエスケープを正規化
    targetJson = targetJson.replace(/\\n/g, "\n");
    
    return JSON.parse(targetJson);
  } catch (e) {
    console.error("JSON Parse Error. Original Text:", text);
    throw new Error("AIデータの解析に失敗しました。もう一度生成をお試しください。");
  }
};

export const generateProfessionalReport = async (
  studentName: string,
  subject: string,
  rawNotes: string,
  homeworkAssigned: string,
  quizScore?: number
) => {
  const prompt = `
    学習塾の指導報告書と週間計画を作成してください。
    【入力データ】生徒: ${studentName}, 科目: ${subject}, 指導メモ: ${rawNotes}, 宿題: ${homeworkAssigned}
    
    【出力の重要ルール】
    1. weeklyPlanは必ず「1日目：...」から「7日目：...」までの形式で作成してください。
    2. 各日の間には必ず '\\n' を入れてください。
    3. lessonSummaryなどは、保護者が安心するプロフェッショナルで温かい文章にしてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
            weeklyPlan: { type: Type.STRING, description: "1日目〜7日目の各行を改行で区切ったテキスト" },
            messageToParents: { type: Type.STRING }
          },
          required: ["lessonSummary", "studentPerformance", "homeworkStatus", "nextSteps", "weeklyPlan", "messageToParents"]
        }
      },
    });
    return extractJson(response.text || "");
  } catch (error) {
    console.error("Report Generation Error:", error);
    throw error;
  }
};

export const generateInterviewMaterial = async (
  studentName: string, 
  grade: string, 
  reports: any[], 
  mockExams: any[], 
  location: string, 
  targetSchool?: string, 
  targetFaculty?: string
) => {
  const reportsSummary = reports.slice(-10).map(r => `${r.date} ${r.subject}: ${r.rawNotes}`).join('\n');
  const mockSummary = mockExams.slice(-5).map(e => `${e.examName}: ${JSON.stringify(e.scores)}`).join('\n');

  const prompt = `
    保護者面談用の戦略資料を詳細に作成してください。
    生徒: ${studentName} (${grade}), 所在地: ${location}, 志望校: ${targetSchool || '未定'} / ${targetFaculty || '未定'}
    【直近の指導データ】\n${reportsSummary}\n【模試成績】\n${mockSummary}
    
    地域性（${location}周辺の学校）を考慮し、具体的で建設的な提案をしてください。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 16384 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            growthPoints: { type: Type.STRING },
            challenges: { type: Type.STRING },
            futureStrategy: { type: Type.STRING },
            parentAdvice: { type: Type.STRING },
            requiredStudyHours: {
              type: Type.OBJECT,
              properties: {
                totalWeekly: { type: Type.NUMBER },
                analysis: { type: Type.STRING },
                subjectBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      subject: { type: Type.STRING },
                      hours: { type: Type.NUMBER },
                      priorityReason: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            suggestedSchools: {
              type: Type.OBJECT,
              properties: {
                public: {
                  type: Type.OBJECT,
                  properties: {
                    challenge: { type: Type.ARRAY, items: { type: Type.STRING } },
                    realistic: { type: Type.ARRAY, items: { type: Type.STRING } },
                    solid: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                },
                private: {
                  type: Type.OBJECT,
                  properties: {
                    challenge: { type: Type.ARRAY, items: { type: Type.STRING } },
                    realistic: { type: Type.ARRAY, items: { type: Type.STRING } },
                    solid: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          required: ["growthPoints", "challenges", "futureStrategy", "parentAdvice", "requiredStudyHours", "suggestedSchools"],
        },
      },
    });
    return extractJson(response.text || "");
  } catch (error) {
    console.error("Interview Material Error:", error);
    throw error;
  }
};

export const generateLearningAdvice = async (studentName: string, weeklyHours: string) => {
  const prompt = `生徒 ${studentName} さんの今週の学習時間は ${weeklyHours} 時間です。モチベーションが上がる短い一言アドバイス（50文字以内）を生成してください。`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "一歩ずつの積み重ねが、大きな成果につながります。";
  } catch (error) {
    return "今日も一歩、成長していきましょう。";
  }
};

export const generateWordQuiz = async (grade: string) => {
  const prompt = `${grade}レベルの英単語クイズを10問作成してください。`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: { 
            word: { type: Type.STRING }, 
            choices: { type: Type.ARRAY, items: { type: Type.STRING } }, 
            answer: { type: Type.STRING } 
          },
          required: ["word", "choices", "answer"]
        }
      }
    },
  });
  return extractJson(response.text || "[]");
};

export const validateDisplayName = async (name: string): Promise<{ isValid: boolean; reason?: string }> => {
  const prompt = `名前: "${name}" が教育アプリに相応しいかチェックしてください。`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { isValid: { type: Type.BOOLEAN }, reason: { type: Type.STRING } },
        required: ["isValid"]
      }
    }
  });
  return extractJson(response.text || "{\"isValid\": false}");
};
