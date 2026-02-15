
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// AI Responses are often clean JSON when responseMimeType is set, but this helper ensures robustness
const extractJson = (text: string) => {
  try {
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    const firstBracket = jsonStr.indexOf('[');
    const firstBrace = jsonStr.indexOf('{');
    
    let targetJson = jsonStr;
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) targetJson = match[0];
    } else if (firstBrace !== -1) {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) targetJson = match[0];
    }
    
    return JSON.parse(targetJson);
  } catch (e) {
    console.error("JSON Parse Error:", text, e);
    throw new Error("AIの回答形式が正しくありません。");
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
    
    【重要制約】
    weeklyPlan（週間学習計画）は、必ず「1日目」から「7日目」までの7日間分を日割りで作成してください。
    各行は必ず「1日目：具体的な内容」という形式から始め、改行して出力してください。
    例：
    1日目：単語帳 p.10-20
    2日目：文法問題集 第3章
    ...
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
            weeklyPlan: { type: Type.STRING, description: "1日目〜7日目の日割り計画（改行区切り）" },
            messageToParents: { type: Type.STRING }
          },
          required: ["lessonSummary", "studentPerformance", "homeworkStatus", "nextSteps", "weeklyPlan", "messageToParents"]
        }
      },
    });
    return extractJson(response.text || "");
  } catch (error) {
    throw error;
  }
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
          properties: { word: { type: Type.STRING }, choices: { type: Type.ARRAY, items: { type: Type.STRING } }, answer: { type: Type.STRING } },
          required: ["word", "choices", "answer"]
        }
      }
    },
  });
  return extractJson(response.text || "");
};

export const generateInterviewMaterial = async (
  studentName: string, grade: string, reports: any[], mockExams: any[], location: string, targetSchool?: string, targetFaculty?: string
) => {
  const prompt = `保護者面談用の戦略資料を作成してください。生徒: ${studentName}, 志望校: ${targetSchool}`;
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { growthPoints: { type: Type.STRING }, challenges: { type: Type.STRING }, futureStrategy: { type: Type.STRING }, parentAdvice: { type: Type.STRING }, requiredStudyHours: { type: Type.OBJECT, properties: { totalWeekly: { type: Type.NUMBER }, analysis: { type: Type.STRING }, subjectBreakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, hours: { type: Type.NUMBER }, priorityReason: { type: Type.STRING } } } } } }, suggestedSchools: { type: Type.OBJECT, properties: { public: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, realistic: { type: Type.ARRAY, items: { type: Type.STRING } }, solid: { type: Type.ARRAY, items: { type: Type.STRING } } } }, private: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, realistic: { type: Type.ARRAY, items: { type: Type.STRING } }, solid: { type: Type.ARRAY, items: { type: Type.STRING } } } } } } },
        required: ["growthPoints", "challenges", "futureStrategy", "parentAdvice", "requiredStudyHours", "suggestedSchools"],
      },
    },
  });
  return extractJson(response.text || "");
};

// Fix: Added generateLearningAdvice function for Dashboard to provide personalized tips
export const generateLearningAdvice = async (studentName: string, weeklyHours: string) => {
  const prompt = `生徒 ${studentName} さんの今週の学習時間は ${weeklyHours} 時間です。学習状況に基づいた、モチベーションが上がる短い一言アドバイス（50文字以内）を生成してください。`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "継続は力なり。今日も一歩進みましょう。";
  } catch (error) {
    console.error("Failed to generate advice:", error);
    return "一歩ずつの積み重ねが、大きな成果につながります。";
  }
};
