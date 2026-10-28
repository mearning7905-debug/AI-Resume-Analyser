import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const generateUUID = () => crypto.randomUUID();

export function normalizeFeedback(raw: any): Feedback {
  const getNum = (val: any, fallback = 70): number => {
    const num = Number(val);
    return isNaN(num) ? fallback : Math.max(0, Math.min(100, Math.round(num)));
  };

  const normalizeTips = (tips: any, defaultExplain = false) => {
    if (!Array.isArray(tips)) return [];
    return tips.map((item: any) => {
      const type = item?.type === 'good' ? 'good' : 'improve';
      const tip = typeof item?.tip === 'string' ? item.tip : (typeof item === 'string' ? item : 'General suggestion');
      const base: any = { type, tip };
      if (defaultExplain || item?.explanation !== undefined) {
        base.explanation = typeof item?.explanation === 'string' ? item.explanation : (item?.tip || '');
      }
      return base;
    });
  };

  const tone = raw?.toneAndStyle || raw?.tone_and_style || raw?.tone || {};
  const content = raw?.content || {};
  const structure = raw?.structure || {};
  const skills = raw?.skills || {};
  const ats = raw?.ATS || raw?.ats || {};

  const overall = raw?.overallScore ?? raw?.overall_score ?? raw?.score ?? Math.round(
    ((getNum(tone.score) + getNum(content.score) + getNum(structure.score) + getNum(skills.score) + getNum(ats.score)) / 5)
  );

  return {
    overallScore: getNum(overall, 75),
    ATS: {
      score: getNum(ats.score, 70),
      tips: normalizeTips(ats.tips),
    },
    toneAndStyle: {
      score: getNum(tone.score, 70),
      tips: normalizeTips(tone.tips, true),
    },
    content: {
      score: getNum(content.score, 70),
      tips: normalizeTips(content.tips, true),
    },
    structure: {
      score: getNum(structure.score, 70),
      tips: normalizeTips(structure.tips, true),
    },
    skills: {
      score: getNum(skills.score, 70),
      tips: normalizeTips(skills.tips, true),
    },
  };
}

export function parseFeedbackJSON(text: string): Feedback | null {
  if (!text || typeof text !== 'string') return null;

  let cleaned = text.trim();

  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '').trim();

  let parsed: any = null;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // If there is surrounding text before or after the JSON object, extract between first { and last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(jsonCandidate);
      } catch (err) {
        console.error("Failed to parse JSON candidate:", err, jsonCandidate);
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  return normalizeFeedback(parsed);
}

