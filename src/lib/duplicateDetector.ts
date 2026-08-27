import { CaseItem } from '../types';
import { getLocalCases } from './offlineStore';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  score: number; // 0 to 100
  level: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  matchReasonAr: string;
  matchReasonEn: string;
  matchedCase: CaseItem | null;
  matchingFields: string[];
}

/**
 * Normalize Arabic text for fuzzy matching:
 * - Unifies alefs (أ, إ, آ -> ا)
 * - Unifies taa marbuta & haa (ة -> ه)
 * - Unifies yaa & alif maksura (ى -> ي)
 * - Removes diacritics (tashkeel)
 * - Removes punctuation and extra whitespace
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    // Remove Arabic diacritics (harakat)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Unify Alef
    .replace(/[إأآٱ]/g, 'ا')
    // Unify Yaa / Alif Maqsura
    .replace(/ى/g, 'ي')
    // Unify Taa Marbuta
    .replace(/ة/g, 'ه')
    // Remove common punctuation and symbols
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize phone numbers (strips +, 00, country code, spaces, dashes)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  // Strip leading 00 or country prefixes if standard
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('963')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('966')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('971')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('961')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('962')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('20')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  return cleaned;
}

/**
 * Normalize URLs (removes protocol, www, trailing slashes, tracking params)
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    let clean = url.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//i, '');
    clean = clean.replace(/^www\./i, '');
    clean = clean.split('?')[0].split('#')[0];
    clean = clean.replace(/\/+$/, '');
    return clean;
  } catch (_) {
    return url.trim().toLowerCase();
  }
}

/**
 * Simple Levenshtein distance & similarity calculator
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabicText(str1);
  const s2 = normalizeArabicText(str2);

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export interface CaseCheckInput {
  caseNumber?: string;
  externalNumber?: string;
  title?: string;
  clientName?: string;
  clientPhone?: string;
  platform?: string;
  caseType?: string;
  urls?: string[];
  excludeCaseId?: string;
}

/**
 * Intelligent Duplicate Case Detector
 * Compares against all local and cached cases
 */
export function detectDuplicateCase(
  input: CaseCheckInput,
  existingCases?: CaseItem[]
): DuplicateMatchResult {
  const casesToSearch = existingCases && existingCases.length > 0 ? existingCases : getLocalCases();
  
  if (!casesToSearch || casesToSearch.length === 0) {
    return {
      isDuplicate: false,
      score: 0,
      level: 'NONE',
      matchReasonAr: '',
      matchReasonEn: '',
      matchedCase: null,
      matchingFields: []
    };
  }

  const normTitle = normalizeArabicText(input.title || '');
  const normClientName = normalizeArabicText(input.clientName || '');
  const normPhone = normalizePhoneNumber(input.clientPhone || '');
  const normExtNum = (input.externalNumber || '').trim().toLowerCase();
  const normCaseNum = (input.caseNumber || '').trim().toLowerCase();
  const inputUrls = (input.urls || []).map(u => normalizeUrl(u)).filter(Boolean);

  let bestMatch: CaseItem | null = null;
  let highestScore = 0;
  let matchReasonsAr: string[] = [];
  let matchReasonsEn: string[] = [];
  let matchedFields: string[] = [];

  for (const existing of casesToSearch) {
    // Skip self if editing
    if (input.excludeCaseId && existing.id === input.excludeCaseId) continue;
    // Skip soft-deleted cases from duplicate warning unless exact match
    if (existing.isDeleted) continue;

    let currentScore = 0;
    const currentReasonsAr: string[] = [];
    const currentReasonsEn: string[] = [];
    const currentFields: string[] = [];

    // 1. Exact Official / External Case Number Match (100%)
    if (normExtNum && existing.externalNumber) {
      const existingExt = existing.externalNumber.trim().toLowerCase();
      if (normExtNum === existingExt) {
        currentScore += 100;
        currentReasonsAr.push(`تطابق تام في رقم القضية الرسمي/المحكمة (${existing.externalNumber})`);
        currentReasonsEn.push(`Exact match in official court case number (${existing.externalNumber})`);
        currentFields.push('externalNumber');
      }
    }

    // 2. Exact Case Number Match (100%)
    if (normCaseNum && existing.caseNumber) {
      if (normCaseNum === existing.caseNumber.trim().toLowerCase()) {
        currentScore += 100;
        currentReasonsAr.push(`تطابق تام في رقم القضية الداخلي (${existing.caseNumber})`);
        currentReasonsEn.push(`Exact match in internal case number (${existing.caseNumber})`);
        currentFields.push('caseNumber');
      }
    }

    // 3. Client Phone Number Match (85%)
    if (normPhone && normPhone.length >= 6 && existing.client?.phone) {
      const existingPhone = normalizePhoneNumber(existing.client.phone);
      if (existingPhone && (existingPhone === normPhone || existingPhone.endsWith(normPhone) || normPhone.endsWith(existingPhone))) {
        currentScore += 85;
        currentReasonsAr.push(`تطابق في رقم هاتف الموكل (${existing.client.phone})`);
        currentReasonsEn.push(`Match in client phone number (${existing.client.phone})`);
        currentFields.push('clientPhone');
      }
    }

    // 4. URL / Links Match (80%)
    if (inputUrls.length > 0) {
      const existingUrls: string[] = [];
      if (existing.typeSpecificData) {
        Object.values(existing.typeSpecificData).forEach(val => {
          if (typeof val === 'string' && (val.includes('http') || val.includes('www.') || val.includes('.com'))) {
            existingUrls.push(normalizeUrl(val));
          }
        });
      }
      for (const inUrl of inputUrls) {
        if (existingUrls.some(eUrl => eUrl && (eUrl === inUrl || eUrl.includes(inUrl) || inUrl.includes(eUrl)))) {
          currentScore += 80;
          currentReasonsAr.push(`تطابق في رابط الحساب/المستند المرفق`);
          currentReasonsEn.push(`Match in target URL/link`);
          currentFields.push('url');
          break;
        }
      }
    }

    // 5. Client Name Similarity
    if (normClientName && existing.client?.name) {
      const existingClientName = normalizeArabicText(existing.client.name);
      if (existingClientName) {
        if (normClientName === existingClientName) {
          currentScore += 70;
          currentReasonsAr.push(`تطابق تام في اسم الموكل (${existing.client.name})`);
          currentReasonsEn.push(`Exact match in client name (${existing.client.name})`);
          currentFields.push('clientName');
        } else {
          const sim = calculateStringSimilarity(normClientName, existingClientName);
          if (sim >= 0.8) {
            const added = Math.round(sim * 55);
            currentScore += added;
            currentReasonsAr.push(`تشابه قوي في اسم الموكل بنسبة ${Math.round(sim * 100)}% مع (${existing.client.name})`);
            currentReasonsEn.push(`High similarity in client name (${Math.round(sim * 100)}%) with (${existing.client.name})`);
            currentFields.push('clientName');
          }
        }
      }
    }

    // 6. Case Title Similarity
    if (normTitle && existing.title) {
      const existingTitle = normalizeArabicText(existing.title);
      if (normTitle === existingTitle) {
        currentScore += 50;
        currentReasonsAr.push(`تطابق تام في عنوان القضية`);
        currentReasonsEn.push(`Exact match in case title`);
        currentFields.push('title');
      } else {
        const sim = calculateStringSimilarity(normTitle, existingTitle);
        if (sim >= 0.75) {
          currentScore += Math.round(sim * 40);
          currentReasonsAr.push(`تشابه في موضوع وعنوان القضية (${Math.round(sim * 100)}%)`);
          currentReasonsEn.push(`Similarity in case title (${Math.round(sim * 100)}%)`);
          currentFields.push('title');
        }
      }
    }

    // 7. Same Case Type & Platform Boost
    if (input.caseType && existing.caseType && input.caseType === existing.caseType) {
      if (input.platform && existing.platform && input.platform.toLowerCase() === existing.platform.toLowerCase()) {
        currentScore += 15;
      }
    }

    // Cap score at 100
    const finalItemScore = Math.min(100, currentScore);

    if (finalItemScore > highestScore) {
      highestScore = finalItemScore;
      bestMatch = existing;
      matchReasonsAr = currentReasonsAr;
      matchReasonsEn = currentReasonsEn;
      matchedFields = currentFields;
    }
  }

  if (highestScore >= 50 && bestMatch) {
    let level: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (highestScore >= 95) level = 'EXACT';
    else if (highestScore >= 75) level = 'HIGH';
    else if (highestScore >= 50) level = 'MEDIUM';

    return {
      isDuplicate: true,
      score: highestScore,
      level,
      matchReasonAr: matchReasonsAr.join(' • '),
      matchReasonEn: matchReasonsEn.join(' • '),
      matchedCase: bestMatch,
      matchingFields: matchedFields
    };
  }

  return {
    isDuplicate: false,
    score: highestScore,
    level: 'NONE',
    matchReasonAr: '',
    matchReasonEn: '',
    matchedCase: null,
    matchingFields: []
  };
}
