
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error?.message?.includes('429') || error?.status === 429) {
        const waitTime = Math.pow(2, i) * 2000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const generateProfessionalReport = async (
  studentName: string,
  subject: string,
  rawNotes: string,
  homeworkAssigned: string,
  attendanceStatus: string,
  quizScore?: number,
  homeworkCompletion?: number
) => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `プロの塾講師として保護者向けの報告書をJSON形式で生成してください。
      生徒:${studentName} 科目:${subject} 出欠:${attendanceStatus} 宿題完了率:${homeworkCompletion}% メモ:${rawNotes} 宿題内容:${homeworkAssigned}`,
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
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

/**
 * IQテストの結果から認知特性と学習アドバイスを生成
 */
export const generateIQAnalysis = async (
  studentName: string,
  grade: string,
  score: number,
  breakdown: any
) => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `知能診断の結果を分析し、保護者と本人向けのアドバイスを生成してください。
      生徒名: ${studentName}, 学年: ${grade}
      正解スコア: ${score}, 各カテゴリ得点(0-100%): 論理性:${breakdown.logical}%, 数値処理:${breakdown.numerical}%, 言語能力:${breakdown.verbal}%, 空間把握:${breakdown.spatial}%
      
      【出力内容の要件】
      1. 数値の結果を肯定的に捉え、その生徒の「武器」となる認知特性を特定してください。
      2. その特性を活かした具体的な「勉強法」を提案してください。
      3. 苦手な分野がある場合、それをどう補うかの戦略を述べてください。`,
    });
    return response.text;
  });
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
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `生徒「${studentName}」の面談資料を生成。
      学年: ${grade}, 志望校: ${targetSchool || "未定"}, 志望学部: ${targetFaculty || "未定"}, 地域: ${location}
      過去の指導報告: ${JSON.stringify(reports)}
      模試成績: ${JSON.stringify(mockExams)}`,
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
                public: { 
                  type: Type.OBJECT, 
                  properties: { 
                    challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                    realistic: { type: Type.ARRAY, items: { type: Type.STRING } } 
                  } 
                },
                private: { 
                  type: Type.OBJECT, 
                  properties: { 
                    challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                    solid: { type: Type.ARRAY, items: { type: Type.STRING } } 
                  } 
                }
              },
              required: ["public", "private"]
            },
            requiredStudyHours: { 
              type: Type.OBJECT, 
              properties: { 
                totalWeekly: { type: Type.NUMBER }, 
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
              }, 
              required: ["totalWeekly", "subjectBreakdown"] 
            },
            parentAdvice: { type: Type.STRING }
          },
          required: ["growthPoints", "challenges", "futureStrategy", "suggestedSchools", "requiredStudyHours", "parentAdvice"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  });
};

export const validateDisplayName = async (name: string): Promise<{ isValid: boolean; reason?: string }> => {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `名前が適切か判定: "${name}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isValid"]
        }
      }
    });
    return JSON.parse(response.text || '{"isValid":true}');
  });
};
