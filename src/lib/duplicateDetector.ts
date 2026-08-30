import { CaseItem } from '../types';
import { getLocalCases } from './offlineStore';

export type DuplicateMatchType = 
  | 'EXACT_PHONE' 
  | 'EXACT_EMAIL' 
  | 'EXACT_IDENTIFIER' 
  | 'NAME_SIMILARITY' 
  | 'MULTIPLE' 
  | 'NONE';

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  score: number; // 0 to 100
  level: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  matchType: DuplicateMatchType;
  matchReasonAr: string;
  matchReasonEn: string;
  matchedCase: CaseItem | null;
  matchingFields: string[];
  isDefiniteMatch: boolean; // True if Phone or Email or Official Identifier matches
  isNameWarningOnly: boolean; // True if only client name matches/similar
}

/**
 * Normalize Arabic text for smart matching:
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
 * Normalize email addresses
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
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
  clientPhone?: string;
  clientEmail?: string;
  clientName?: string;
  nationalId?: string;
  externalNumber?: string; // Official court number or external ID
  title?: string;
  platform?: string;
  caseType?: string;
  urls?: string[];
  notes?: string;
  excludeCaseId?: string;
}

/**
 * Intelligent Duplicate Case Detector
 * CRITICAL RULE:
 * Case Number is NEVER a duplicate detection criterion (it is a unique generated ID).
 * Duplicate detection relies strictly on:
 * 1. Phone number (Exact match = high priority)
 * 2. Email (Exact match = high priority)
 * 3. Client Name (Exact or fuzzy match = warning for possible related case)
 * 4. National ID / Identifiers & URLs
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
      matchType: 'NONE',
      matchReasonAr: '',
      matchReasonEn: '',
      matchedCase: null,
      matchingFields: [],
      isDefiniteMatch: false,
      isNameWarningOnly: false
    };
  }

  const normPhone = normalizePhoneNumber(input.clientPhone || '');
  const normEmail = normalizeEmail(input.clientEmail || '');
  const normClientName = normalizeArabicText(input.clientName || '');
  const normExtNum = (input.externalNumber || '').trim().toLowerCase();
  const normNationalId = (input.nationalId || '').trim().toLowerCase();
  const normTitle = normalizeArabicText(input.title || '');
  const inputUrls = (input.urls || []).map(u => normalizeUrl(u)).filter(Boolean);

  let bestMatch: CaseItem | null = null;
  let highestScore = 0;
  let matchReasonsAr: string[] = [];
  let matchReasonsEn: string[] = [];
  let matchedFields: string[] = [];
  let detectedMatchType: DuplicateMatchType = 'NONE';
  let isDefinite = false;
  let isNameOnly = false;

  for (const existing of casesToSearch) {
    if (!existing) continue;
    // Skip self if editing
    if (input.excludeCaseId && existing.id === input.excludeCaseId) continue;
    // Skip soft-deleted cases
    if (existing.isDeleted || (existing as any)._deleted) continue;

    let currentScore = 0;
    const currentReasonsAr: string[] = [];
    const currentReasonsEn: string[] = [];
    const currentFields: string[] = [];
    let itemHasDefiniteMatch = false;

    // 1. Phone Number Match (Highest Priority: 95%)
    if (normPhone && normPhone.length >= 6) {
      const existingPhone = normalizePhoneNumber(existing.client?.phone || (existing.client as any)?.whatsapp || '');
      if (existingPhone && (existingPhone === normPhone || existingPhone.endsWith(normPhone) || normPhone.endsWith(existingPhone))) {
        currentScore += 95;
        currentReasonsAr.push(`تطابق دقيق في رقم هاتف العميل (${existing.client?.phone || existingPhone})`);
        currentReasonsEn.push(`Exact match in client phone (${existing.client?.phone || existingPhone})`);
        currentFields.push('clientPhone');
        itemHasDefiniteMatch = true;
      }
    }

    // 2. Email Address Match (Highest Priority: 95%)
    if (normEmail && normEmail.includes('@') && existing.client?.email) {
      const existingEmail = normalizeEmail(existing.client.email);
      if (existingEmail && existingEmail === normEmail) {
        currentScore += 95;
        currentReasonsAr.push(`تطابق دقيق في البريد الإلكتروني (${existing.client.email})`);
        currentReasonsEn.push(`Exact match in client email (${existing.client.email})`);
        currentFields.push('clientEmail');
        itemHasDefiniteMatch = true;
      }
    }

    // 3. National ID or External Identifier Match (90%)
    if (normNationalId) {
      const existingId = (existing.client as any)?.nationalId || (existing.typeSpecificData as any)?.nationalId;
      if (existingId && String(existingId).trim().toLowerCase() === normNationalId) {
        currentScore += 90;
        currentReasonsAr.push(`تطابق في الرقم الوطني/الهوية (${normNationalId})`);
        currentReasonsEn.push(`Match in National ID (${normNationalId})`);
        currentFields.push('nationalId');
        itemHasDefiniteMatch = true;
      }
    }

    if (normExtNum && existing.externalNumber) {
      if (normExtNum === existing.externalNumber.trim().toLowerCase()) {
        currentScore += 85;
        currentReasonsAr.push(`تطابق في رقم القضية الرسمي/المحكمة (${existing.externalNumber})`);
        currentReasonsEn.push(`Match in official court case number (${existing.externalNumber})`);
        currentFields.push('externalNumber');
        itemHasDefiniteMatch = true;
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
          itemHasDefiniteMatch = true;
          break;
        }
      }
    }

    // 5. Client Name Similarity (Warning Level: 50-65% - Potential Related Case)
    if (normClientName && normClientName.length >= 3 && existing.client?.name) {
      const existingClientName = normalizeArabicText(existing.client.name);
      if (existingClientName) {
        if (normClientName === existingClientName) {
          // Exact name match
          currentScore += 65;
          currentReasonsAr.push(`تشابه تام في اسم العميل (${existing.client.name})`);
          currentReasonsEn.push(`Exact client name match (${existing.client.name})`);
          currentFields.push('clientName');
        } else {
          // Fuzzy name match
          const sim = calculateStringSimilarity(normClientName, existingClientName);
          if (sim >= 0.82) {
            const added = Math.round(sim * 55);
            currentScore += added;
            currentReasonsAr.push(`تشابه قوي في اسم العميل بنسبة ${Math.round(sim * 100)}% مع (${existing.client.name})`);
            currentReasonsEn.push(`Name similarity (${Math.round(sim * 100)}%) with (${existing.client.name})`);
            currentFields.push('clientName');
          }
        }
      }
    }

    // 6. Case Title / Topic Similarity (Supplementary: up to 35%)
    if (normTitle && normTitle.length >= 4 && existing.title) {
      const existingTitle = normalizeArabicText(existing.title);
      if (normTitle === existingTitle) {
        currentScore += 35;
        currentReasonsAr.push(`تطابق في موضوع القضية`);
        currentFields.push('title');
      } else {
        const sim = calculateStringSimilarity(normTitle, existingTitle);
        if (sim >= 0.8) {
          currentScore += Math.round(sim * 25);
          currentReasonsAr.push(`تقارب في موضوع القضية (${Math.round(sim * 100)}%)`);
          currentFields.push('title');
        }
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
      isDefinite = itemHasDefiniteMatch;
      isNameOnly = !itemHasDefiniteMatch && currentFields.includes('clientName');

      if (currentFields.includes('clientPhone') && currentFields.includes('clientEmail')) {
        detectedMatchType = 'MULTIPLE';
      } else if (currentFields.includes('clientPhone')) {
        detectedMatchType = 'EXACT_PHONE';
      } else if (currentFields.includes('clientEmail')) {
        detectedMatchType = 'EXACT_EMAIL';
      } else if (currentFields.includes('nationalId') || currentFields.includes('externalNumber')) {
        detectedMatchType = 'EXACT_IDENTIFIER';
      } else if (currentFields.includes('clientName')) {
        detectedMatchType = 'NAME_SIMILARITY';
      } else {
        detectedMatchType = 'NONE';
      }
    }
  }

  // Threshold for triggering duplicate alert
  if (highestScore >= 50 && bestMatch) {
    let level: 'EXACT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (highestScore >= 90) level = 'EXACT';
    else if (highestScore >= 70) level = 'HIGH';
    else if (highestScore >= 50) level = 'MEDIUM';

    return {
      isDuplicate: true,
      score: highestScore,
      level,
      matchType: detectedMatchType,
      matchReasonAr: matchReasonsAr.join(' • '),
      matchReasonEn: matchReasonsEn.join(' • '),
      matchedCase: bestMatch,
      matchingFields: matchedFields,
      isDefiniteMatch: isDefinite,
      isNameWarningOnly: isNameOnly
    };
  }

  return {
    isDuplicate: false,
    score: highestScore,
    level: 'NONE',
    matchType: 'NONE',
    matchReasonAr: '',
    matchReasonEn: '',
    matchedCase: null,
    matchingFields: [],
    isDefiniteMatch: false,
    isNameWarningOnly: false
  };
}
