
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const generateProfessionalReport = async (
  studentName: string,
  subject: string,
  rawNotes: string,
  homeworkAssigned: string,
  attendanceStatus: string,
  quizScore?: number,
  homeworkCompletion?: number
) => {
  const ai = getAI();
  if (!ai) {
    // Demo Mode Fallback
    await delay(1500);
    return {
      lessonSummary: `本日の${subject}の授業では、${rawNotes.slice(0, 30)}...を中心に取り組みました。非常に集中して取り組めています。`,
      studentPerformance: "課題に対する理解が早く、自力で解く力が増しています。特に後半の問題では正答率が100%でした。",
      homeworkStatus: `前回の宿題（${homeworkAssigned}）は${homeworkCompletion || 0}%完了していました。`,
      nextSteps: "次回は発展問題に挑戦し、さらなる応用力の向上を目指します。",
      weeklyPlan: "1日目：p.10 復習\n2日目：p.11 例題\n3日目：p.12 練習A\n4日目：p.13 練習B\n5日目：間違えた箇所の解き直し\n6日目：確認テスト\n7日目：次回の予習",
      messageToParents: `${studentName}さんは着実に実力をつけています。ご家庭でもぜひ褒めてあげてください。`
    };
  }

  const prompt = `
    プロの塾講師として保護者向けの報告書をJSON形式で生成してください。
    生徒:${studentName} 科目:${subject} 出欠:${attendanceStatus} 宿題完了率:${homeworkCompletion}% メモ:${rawNotes} 宿題内容:${homeworkAssigned}
    weeklyPlanは必ず「1日目：[内容]」という形式で7日間分作成してください。
  `;

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
          weeklyPlan: { type: Type.STRING },
          messageToParents: { type: Type.STRING }
        },
        required: ["lessonSummary", "studentPerformance", "homeworkStatus", "nextSteps", "weeklyPlan", "messageToParents"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
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
  const ai = getAI();
  if (!ai) {
    await delay(2000);
    return {
      growthPoints: "直近3ヶ月で計算ミスが大幅に減少し、数学の偏差値が安定してきました。",
      challenges: "英語の長文読解において、時間配分が課題となっています。",
      futureStrategy: "夏休みまでに英単語3000語を完璧にし、秋以降は過去問演習に特化します。",
      suggestedSchools: {
        public: { challenge: ["県立浦和高校"], realistic: ["県立大宮高校"] },
        private: { challenge: ["早稲田大学本庄高等学院"], solid: ["栄東高校"] }
      },
      requiredStudyHours: {
        totalWeekly: 35,
        subjectBreakdown: [
          { subject: "英語", hours: 15, priorityReason: "長文読解の基礎固めが必要" },
          { subject: "数学", hours: 10, priorityReason: "二次関数を得点源にする" }
        ]
      },
      parentAdvice: "家ではリラックスできる環境を作り、夜更かしをしないようサポートをお願いします。"
    };
  }

  const prompt = `
    生徒「${studentName}」の面談資料を生成。
    学年: ${grade}, 志望校: ${targetSchool || "未定"}, 志望学部: ${targetFaculty || "未定"}, 地域: ${location}
    過去の指導報告: ${JSON.stringify(reports)}
    模試成績: ${JSON.stringify(mockExams)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
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
              public: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, realistic: { type: Type.ARRAY, items: { type: Type.STRING } } } },
              private: { type: Type.OBJECT, properties: { challenge: { type: Type.ARRAY, items: { type: Type.STRING } }, solid: { type: Type.ARRAY, items: { type: Type.STRING } } } }
            },
            required: ["public", "private"]
          },
          requiredStudyHours: { type: Type.OBJECT, properties: { totalWeekly: { type: Type.NUMBER }, subjectBreakdown: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { subject: { type: Type.STRING }, hours: { type: Type.NUMBER }, priorityReason: { type: Type.STRING } } } } }, required: ["totalWeekly", "subjectBreakdown"] },
          parentAdvice: { type: Type.STRING }
        },
        required: ["growthPoints", "challenges", "futureStrategy", "suggestedSchools", "requiredStudyHours", "parentAdvice"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const validateDisplayName = async (name: string): Promise<{ isValid: boolean; reason?: string }> => {
  const ai = getAI();
  if (!ai) return { isValid: true };
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
