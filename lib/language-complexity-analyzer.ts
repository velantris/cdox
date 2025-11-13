import nlp from "compromise";
import { LanguageProfile, resolveLanguageProfile } from "./language-profiles";

type CEFREstimate = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface VocabularyComplexityMetrics {
    totalWords: number;
    uniqueWords: number;
    lexicalDensity: number;
    averageWordLength: number;
    simpleWordPercentage: number;
    advancedWordPercentage: number;
    complexWordPercentage: number;
    jargonCount: number;
    jargonTerms: string[];
    advancedSample: string[];
}

export interface SentenceComplexityMetrics {
    sentenceCount: number;
    averageSentenceLength: number;
    complexSentencePercentage: number;
    subordinateClauseDensity: number;
    passiveVoicePercentage: number;
    modalVerbPercentage: number;
    conditionalSentencePercentage: number;
}

export interface LanguageComplexityAnalysis {
    cefrLevel: CEFREstimate;
    b2ComplianceScore: number;
    plainLanguageScore: number;
    readabilityAdjusted: number;
    fleschKincaidGrade: number;
    vocabularyComplexity: VocabularyComplexityMetrics;
    sentenceComplexity: SentenceComplexityMetrics;
    plainLanguageRecommendations: string[];
}

const MAX_WORD_SAMPLE = 15;

export function analyzeLanguageComplexity(rawText: string, language?: string): LanguageComplexityAnalysis {
    const profile = resolveLanguageProfile(language);
    const text = normalizeWhitespace(rawText);
    const sentences = getSentences(text);
    const normalizedSentences = sentences.map((sentence) => normalizeSentence(sentence));
    const words = getWords(text);
    const normalizedWords = words.map((word) => normalizeWord(word));
    const wordCount = Math.max(words.length, 1);
    const sentenceCount = Math.max(sentences.length, 1);

    const uniqueWords = new Set(normalizedWords.filter((w) => w.length > 0));
    const lexicalDensity = uniqueWords.size / wordCount;
    const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;

    const syllableCounts = words.map((word, index) => estimateSyllables(word, normalizedWords[index], profile));
    const totalSyllables = syllableCounts.reduce((sum, syllables) => sum + syllables, 0);

    const simpleWordHits = normalizedWords.filter((word) => profile.simpleWords.has(word)).length;
    const complexWordCount = syllableCounts.filter((syllables) => syllables >= 3).length;
    const advancedWords = collectAdvancedWords(words, normalizedWords, profile);
    const jargonTerms = detectJargonTerms(words, normalizedWords, advancedWords.frequencyMap, advancedWords.displayMap, profile);

    const simpleWordRatio = simpleWordHits / wordCount;
    const advancedWordRatio = advancedWords.count / wordCount;
    const complexWordRatio = complexWordCount / wordCount;

    const simpleWordPercentage = simpleWordRatio * 100;
    const advancedWordPercentage = advancedWordRatio * 100;
    const complexWordPercentage = complexWordRatio * 100;

    const stopwordHits = normalizedWords.filter((word) => profile.stopwords.has(word)).length;
    const stopwordRatio = stopwordHits / wordCount;
    const languageConfidence = calculateLanguageConfidence(simpleWordRatio, stopwordRatio, profile);
    const isLikelyTargetLanguage = languageConfidence >= profile.confidenceThreshold;
    const penaltyScaling = isLikelyTargetLanguage ? 1 : Math.max(profile.penaltyFloor, languageConfidence + profile.penaltyBias);

    const advancedWordPercentageForScoring = clamp(advancedWordPercentage * penaltyScaling, 0, 100);
    const complexWordPercentageForScoring = clamp(complexWordPercentage * penaltyScaling, 0, 100);
    const jargonSeverityForScoring = Math.min(Math.round(jargonTerms.length * penaltyScaling), 20);

    const subordinateClauseMetrics = countSubordinateClauses(normalizedSentences, profile);
    const passiveVoicePercentage = estimatePassiveVoice(normalizedSentences, profile);
    const modalVerbPercentage = estimateModalUsage(normalizedWords, wordCount, profile);
    const conditionalSentencePercentage = estimateConditionals(normalizedSentences, sentenceCount, profile);

    const averageSentenceLength = wordCount / sentenceCount;
    const complexSentencePercentage = calculateComplexSentenceShare(
        sentences,
        averageSentenceLength,
        subordinateClauseMetrics.clausesBySentence,
    );
    const subordinateClauseDensity = subordinateClauseMetrics.totalClauses / sentenceCount;

    const fleschKincaidGrade = calculateFleschKincaid(wordCount, sentenceCount, totalSyllables);
    const readabilityAdjusted = adjustForB2(
        fleschKincaidGrade,
        averageSentenceLength,
        advancedWordPercentageForScoring,
        passiveVoicePercentage,
    );

    const cefrLevel = estimateCEFRLevel(
        fleschKincaidGrade,
        advancedWordPercentageForScoring,
        passiveVoicePercentage,
    );

    const b2ComplianceScore = calculateB2Compliance({
        averageSentenceLength,
        advancedWordPercentage: advancedWordPercentageForScoring,
        passiveVoicePercentage,
        complexSentencePercentage,
        lexicalDensity,
    });

    const plainLanguageScore = calculatePlainLanguageScore({
        averageSentenceLength,
        passiveVoicePercentage,
        complexWordPercentage: complexWordPercentageForScoring,
        jargonSeverity: jargonSeverityForScoring,
        readabilityAdjusted,
    });

    const recommendations = buildPlainLanguageRecommendations({
        averageSentenceLength,
        passiveVoicePercentage,
        complexWordPercentage,
        advancedWordPercentage: advancedWordPercentageForScoring,
        jargonCount: jargonTerms.length,
        lexicalDensity,
        plainLanguageScore,
        b2ComplianceScore,
    });

    if (!isLikelyTargetLanguage) {
        recommendations.unshift(profile.approximationNote);
        if (recommendations.length > 6) {
            recommendations.length = 6;
        }
    }

    return {
        cefrLevel,
        b2ComplianceScore,
        plainLanguageScore,
        readabilityAdjusted,
        fleschKincaidGrade,
        vocabularyComplexity: {
            totalWords: wordCount,
            uniqueWords: uniqueWords.size,
            lexicalDensity,
            averageWordLength,
            simpleWordPercentage,
            advancedWordPercentage,
            complexWordPercentage,
            jargonCount: jargonTerms.length,
            jargonTerms,
            advancedSample: advancedWords.sample,
        },
        sentenceComplexity: {
            sentenceCount,
            averageSentenceLength,
            complexSentencePercentage,
            subordinateClauseDensity,
            passiveVoicePercentage,
            modalVerbPercentage,
            conditionalSentencePercentage,
        },
        plainLanguageRecommendations: recommendations,
    };
}

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function getSentences(text: string): string[] {
    try {
        const doc = nlp(text);
        const parsed = doc.sentences().out("array") as string[];
        if (parsed.length > 0) {
            return parsed;
        }
    } catch {
        // ignore parsing failures and fall back to heuristic splitting
    }
    return text.split(/(?<=[.?!])\s+/).filter(Boolean);
}

function getWords(text: string): string[] {
    const matches = text.match(/\b[\p{L}]+(?:'[\p{L}]+)?\b/gu);
    if (!matches) {
        return [];
    }
    return matches;
}

function estimateSyllables(word: string, normalized: string, profile: LanguageProfile): number {
    if (!normalized) {
        return 0;
    }
    switch (profile.id) {
        case "italian":
            return estimateItalianSyllables(normalized);
        case "english":
        default:
            return estimateEnglishSyllables(normalized);
    }
}

function estimateEnglishSyllables(normalized: string): number {
    const cleaned = normalized.replace(/[^a-z]/g, "");
    if (!cleaned) {
        return 0;
    }
    if (cleaned.length <= 3) {
        return 1;
    }
    const syllableMatches = cleaned
        .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/u, "")
        .replace(/^y/u, "")
        .match(/[aeiouy]{1,2}/g);
    return syllableMatches ? syllableMatches.length : 1;
}

function estimateItalianSyllables(normalized: string): number {
    const cleaned = normalized.replace(/[^a-z]/g, "");
    if (!cleaned) {
        return 0;
    }
    const vowelMatches = cleaned.match(/[aeiou]+/g);
    if (!vowelMatches) {
        return 1;
    }
    let syllables = vowelMatches.length;
    const quMatches = cleaned.match(/qu[aeiou]/g);
    if (quMatches) {
        syllables -= quMatches.length;
    }
    return Math.max(1, syllables);
}

function collectAdvancedWords(words: string[], normalizedWords: string[], profile: LanguageProfile) {
    const frequencyMap = new Map<string, number>();
    const displayMap = new Map<string, string>();
    let advancedCount = 0;

    for (let index = 0; index < words.length; index += 1) {
        const normalized = normalizedWords[index];
        if (!normalized) {
            continue;
        }
        if (profile.simpleWords.has(normalized)) {
            continue;
        }

        advancedCount += 1;
        frequencyMap.set(normalized, (frequencyMap.get(normalized) || 0) + 1);
        if (!displayMap.has(normalized)) {
            displayMap.set(normalized, words[index].toLowerCase());
        }
    }

    const sortedAdvanced = Array.from(frequencyMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_WORD_SAMPLE)
        .map(([normalized]) => displayMap.get(normalized) ?? normalized);

    return {
        count: advancedCount,
        frequencyMap,
        displayMap,
        sample: sortedAdvanced,
    };
}

function detectJargonTerms(
    words: string[],
    normalizedWords: string[],
    frequencyMap: Map<string, number>,
    displayMap: Map<string, string>,
    profile: LanguageProfile,
): string[] {
    const jargonCandidates = new Map<string, number>();

    for (let index = 0; index < words.length; index += 1) {
        const normalized = normalizedWords[index];
        if (!normalized || profile.simpleWords.has(normalized)) {
            continue;
        }

        const displayTerm = displayMap.get(normalized) ?? words[index].toLowerCase();
        if (displayTerm.length >= 12) {
            jargonCandidates.set(normalized, (jargonCandidates.get(normalized) || 0) + 1);
            continue;
        }

        if (profile.technicalSuffixes.some((suffix) => normalized.endsWith(suffix))) {
            jargonCandidates.set(normalized, (jargonCandidates.get(normalized) || 0) + 1);
        }
    }

    const sorted = Array.from(jargonCandidates.entries())
        .sort((a, b) => {
            const frequencyDelta = (frequencyMap.get(b[0]) || 0) - (frequencyMap.get(a[0]) || 0);
            if (frequencyDelta !== 0) {
                return frequencyDelta;
            }
            const displayA = displayMap.get(a[0]) ?? a[0];
            const displayB = displayMap.get(b[0]) ?? b[0];
            return displayB.length - displayA.length;
        })
        .map(([normalized]) => displayMap.get(normalized) ?? normalized);

    return sorted.slice(0, MAX_WORD_SAMPLE);
}

function countSubordinateClauses(normalizedSentences: string[], profile: LanguageProfile) {
    let totalClauses = 0;
    const clausesBySentence: number[] = [];

    for (let index = 0; index < normalizedSentences.length; index += 1) {
        let clauseCount = 0;
        const normalizedSentence = normalizedSentences[index];

        profile.subordinateConjunctions.forEach((conjunction) => {
            const regex = new RegExp(`\\b${escapeRegExp(conjunction)}\\b`, "g");
            const matches = normalizedSentence.match(regex);
            if (matches) {
                clauseCount += matches.length;
            }
        });

        totalClauses += clauseCount;
        clausesBySentence.push(clauseCount);
    }

    return { totalClauses, clausesBySentence };
}

function estimatePassiveVoice(normalizedSentences: string[], profile: LanguageProfile): number {
    if (normalizedSentences.length === 0) {
        return 0;
    }
    let passiveCount = 0;
    for (const sentence of normalizedSentences) {
        const hasPassive = profile.passivePatterns.some((pattern) => regexTest(pattern, sentence));
        if (hasPassive) {
            passiveCount += 1;
        }
    }
    return (passiveCount / normalizedSentences.length) * 100;
}

function estimateModalUsage(normalizedWords: string[], wordCount: number, profile: LanguageProfile): number {
    const modalCount = normalizedWords.filter((word) => profile.modalVerbs.has(word)).length;
    return (modalCount / Math.max(wordCount, 1)) * 100;
}

function estimateConditionals(normalizedSentences: string[], sentenceCount: number, profile: LanguageProfile): number {
    let conditionalCount = 0;
    for (const sentence of normalizedSentences) {
        if (regexTest(profile.conditionTrigger, sentence) && regexTest(profile.conditionalHelpers, sentence)) {
            conditionalCount += 1;
        }
    }
    return (conditionalCount / Math.max(sentenceCount, 1)) * 100;
}

function calculateComplexSentenceShare(
    sentences: string[],
    averageSentenceLength: number,
    clausesBySentence: number[],
): number {
    if (sentences.length === 0) {
        return 0;
    }
    const sentenceLengths = sentences.map((sentence) => getWords(sentence).length);
    let complexCount = 0;
    sentenceLengths.forEach((length, index) => {
        if (length >= Math.max(25, averageSentenceLength * 1.4) || clausesBySentence[index] >= 2) {
            complexCount += 1;
        }
    });
    return (complexCount / sentences.length) * 100;
}

function calculateFleschKincaid(words: number, sentences: number, syllables: number): number {
    if (words === 0 || sentences === 0) {
        return 0;
    }
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

function adjustForB2(
    fleschKincaid: number,
    averageSentenceLength: number,
    advancedWordPercentage: number,
    passiveVoicePercentage: number,
): number {
    const penalty =
        Math.max(0, averageSentenceLength - 22) * 0.4 +
        Math.max(0, advancedWordPercentage - 25) * 0.3 +
        Math.max(0, passiveVoicePercentage - 20) * 0.25;
    return Math.max(0, fleschKincaid - penalty / 4);
}

function estimateCEFRLevel(
    fleschKincaid: number,
    advancedWordPercentage: number,
    passiveVoicePercentage: number,
): CEFREstimate {
    if (fleschKincaid <= 6 && advancedWordPercentage < 10) {
        return "A2";
    }
    if (fleschKincaid <= 8 && advancedWordPercentage < 15) {
        return "B1";
    }
    if (fleschKincaid <= 11 && advancedWordPercentage < 22 && passiveVoicePercentage < 25) {
        return "B2";
    }
    if (fleschKincaid <= 13 || advancedWordPercentage < 28) {
        return "C1";
    }
    return "C2";
}

interface B2Inputs {
    averageSentenceLength: number;
    advancedWordPercentage: number;
    passiveVoicePercentage: number;
    complexSentencePercentage: number;
    lexicalDensity: number;
}

function calculateB2Compliance(inputs: B2Inputs): number {
    let score = 100;

    score -= Math.max(0, inputs.averageSentenceLength - 22) * 1.2;
    score -= Math.max(0, inputs.advancedWordPercentage - 25) * 1.4;
    score -= Math.max(0, inputs.passiveVoicePercentage - 20) * 1.0;
    score -= Math.max(0, inputs.complexSentencePercentage - 35) * 0.8;
    score -= Math.max(0, inputs.lexicalDensity * 100 - 55) * 0.6;

    return clamp(score, 0, 100);
}

interface PlainLanguageInputs {
    averageSentenceLength: number;
    passiveVoicePercentage: number;
    complexWordPercentage: number;
    jargonSeverity: number;
    readabilityAdjusted: number;
}

function calculatePlainLanguageScore(inputs: PlainLanguageInputs): number {
    let score = 100;

    score -= Math.max(0, inputs.averageSentenceLength - 18) * 1.5;
    score -= Math.max(0, inputs.passiveVoicePercentage - 15) * 1.2;
    score -= Math.max(0, inputs.complexWordPercentage - 12) * 1.1;
    score -= Math.max(0, inputs.jargonSeverity - 8) * 3;
    score -= Math.max(0, inputs.readabilityAdjusted - 10) * 2;

    return clamp(score, 0, 100);
}

interface RecommendationInputs {
    averageSentenceLength: number;
    passiveVoicePercentage: number;
    complexWordPercentage: number;
    advancedWordPercentage: number;
    jargonCount: number;
    lexicalDensity: number;
    plainLanguageScore: number;
    b2ComplianceScore: number;
}

function buildPlainLanguageRecommendations(inputs: RecommendationInputs): string[] {
    const recommendations: string[] = [];

    if (inputs.averageSentenceLength > 20) {
        recommendations.push("Shorten sentences to average 15-20 words to align with plain language best practices.");
    }
    if (inputs.passiveVoicePercentage > 20) {
        recommendations.push("Rewrite passive constructions in active voice where possible to improve clarity.");
    }
    if (inputs.complexWordPercentage > 15 || inputs.advancedWordPercentage > 25) {
        recommendations.push("Replace complex vocabulary with familiar B2-level terms or provide immediate definitions.");
    }
    if (inputs.jargonCount > 5) {
        recommendations.push("Reduce or define domain-specific jargon to support WCAG plain language expectations.");
    }
    if (inputs.lexicalDensity > 0.55) {
        recommendations.push("Break dense paragraphs into shorter sentences and add examples to support comprehension.");
    }
    if (inputs.plainLanguageScore < 70) {
        recommendations.push("Introduce bullet lists, headings, and summaries to boost plain language compliance.");
    }
    if (inputs.b2ComplianceScore < 70) {
        recommendations.push("Audit vocabulary against CEFR B2 expectations and flag overly advanced sections.");
    }

    return recommendations.slice(0, 6);
}

function calculateLanguageConfidence(simpleWordRatio: number, stopwordRatio: number, profile: LanguageProfile): number {
    const stopwordContribution = stopwordRatio * profile.stopwordConfidenceBoost;
    return clamp(Math.max(simpleWordRatio, stopwordContribution), 0, 1);
}

function normalizeSentence(sentence: string): string {
    return stripDiacritics(sentence.toLowerCase());
}

function normalizeWord(word: string): string {
    return stripDiacritics(word.toLowerCase()).replace(/[^a-z]/g, "");
}

function stripDiacritics(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function regexTest(pattern: RegExp, value: string): boolean {
    pattern.lastIndex = 0;
    return pattern.test(value);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

