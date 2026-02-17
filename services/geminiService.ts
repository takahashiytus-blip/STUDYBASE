
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client following the guidelines
// The API key is assumed to be available in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a professional instruction report using Gemini Flash.
 */
export const generateProfessionalReport = async (
  studentName: string,
  subject: string,
  rawNotes: string,
  homeworkAssigned: string,
  attendanceStatus: string,
  quizScore?: number,
  homeworkCompletion?: number
) => {
  // Use gemini-3-flash-preview for text-based summarization and planning tasks
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `プロの塾講師として保護者向けの報告書をJSON形式で生成してください。
    生徒:${studentName} 科目:${subject} 出欠:${attendanceStatus} 宿題完了率:${homeworkCompletion}% メモ:${rawNotes} 宿題内容:${homeworkAssigned}
    weeklyPlanは必ず「1日目：[内容]」という形式で7日間分作成してください。`,
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

  // Extract text directly from response.text property
  return JSON.parse(response.text || "{}");
};

/**
 * Generates interview strategies and target school suggestions using Gemini Pro.
 */
export const generateInterviewMaterial = async (
  studentName: string,
  grade: string,
  reports: any[],
  mockExams: any[],
  location: string,
  targetSchool?: string,
  targetFaculty?: string
) => {
  // Use gemini-3-pro-preview for complex reasoning and strategic analysis
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
};

/**
 * Validates display names for appropriateness using Gemini Flash.
 */
export const validateDisplayName = async (name: string): Promise<{ isValid: boolean; reason?: string }> => {
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
};
