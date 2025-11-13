export type SeverityLevel = "critical" | "high" | "medium" | "low";

export const SCORING_CATEGORIES = [
  "clarity",
  "grammar",
  "style",
  "legal",
  "compliance",
  "structure",
  "accessibility",
  "security",
  "transparency",
  "other",
] as const;

export type ScoringCategory = (typeof SCORING_CATEGORIES)[number];

export type SeverityWeights = Record<SeverityLevel, number>;

export type CategoryWeights = Record<ScoringCategory, number>;

export type Thresholds = {
  pass: number;
  warning: number;
  fail: number;
};

export type ScoringConfig = {
  _id?: string;
  name: string;
  isDefault: boolean;
  severityWeights: SeverityWeights;
  categoryWeights: CategoryWeights;
  thresholds: Thresholds;
};

export type IssueForScoring = {
  severity: string;
  type: string;
};

export type WeightedIssue = IssueForScoring & {
  category: ScoringCategory;
  multiplier: number;
};

export type SeverityCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type CombineScoresArgs = {
  aiScore: number | null | undefined;
  issueScore: number;
  issueCounts: SeverityCounts;
};

type CombinedScoreResult = {
  finalScore: number;
  aiAdjustedScore: number | null;
  severityPenalty: number;
  aiWeight: number;
  issueWeight: number;
};

const DEFAULT_SEVERITY_WEIGHTS: SeverityWeights = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  clarity: 1,
  grammar: 1,
  style: 1,
  legal: 1,
  compliance: 1,
  structure: 1,
  accessibility: 1,
  security: 1,
  transparency: 1,
  other: 1,
};

const DEFAULT_THRESHOLDS: Thresholds = {
  pass: 85,
  warning: 70,
  fail: 0,
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  name: "Platform Default",
  isDefault: true,
  severityWeights: DEFAULT_SEVERITY_WEIGHTS,
  categoryWeights: DEFAULT_CATEGORY_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
};

function normalizeSeverity(severity: string): SeverityLevel {
  const lowered = severity.toLowerCase();
  if (lowered === "critical" || lowered === "high" || lowered === "medium" || lowered === "low") {
    return lowered;
  }
  return "medium";
}

function normalizeCategory(type: string): ScoringCategory {
  const lowered = type.toLowerCase() as ScoringCategory;
  if (SCORING_CATEGORIES.includes(lowered)) {
    return lowered;
  }
  return "other";
}

export function applyCategoryWeights(
  issues: IssueForScoring[],
  weights: Partial<CategoryWeights> = {},
): WeightedIssue[] {
  return issues.map((issue) => {
    const category = normalizeCategory(issue.type);
    const multiplier = weights[category] ?? DEFAULT_CATEGORY_WEIGHTS[category];
    return {
      ...issue,
      category,
      multiplier,
    };
  });
}

export function calculateScore(
  issues: IssueForScoring[],
  config: Partial<ScoringConfig> | null | undefined,
): number {
  if (!issues.length) {
    return 100;
  }

  const severityWeights = config?.severityWeights ?? DEFAULT_SEVERITY_WEIGHTS;
  const categoryWeights = config?.categoryWeights ?? DEFAULT_CATEGORY_WEIGHTS;

  const weightedIssues = applyCategoryWeights(issues, categoryWeights);
  const severityTotals: Record<SeverityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const issue of weightedIssues) {
    const severity = normalizeSeverity(issue.severity);
    const multiplier =
      typeof issue.multiplier === "number" && Number.isFinite(issue.multiplier)
        ? issue.multiplier
        : 1;
    severityTotals[severity] += multiplier;
  }

  const severityLevels: SeverityLevel[] = ["critical", "high", "medium", "low"];
  const totalDeduction = severityLevels.reduce((acc, severity) => {
    const weightedCount = severityTotals[severity];
    if (weightedCount <= 0) {
      return acc;
    }

    const baseWeight = severityWeights[severity] ?? DEFAULT_SEVERITY_WEIGHTS[severity];
    const severityPenalty = baseWeight * Math.sqrt(weightedCount);
    return acc + severityPenalty;
  }, 0);

  // Ensure score is never 0 - comprehensibility score is non-optional and must be given
  // Minimum score of 1 ensures the document always has a measurable comprehensibility score
  const normalizedDeduction = Math.min(95, totalDeduction);
  const boundedScore = Math.max(1, Math.min(100, Math.round(100 - normalizedDeduction)));
  return boundedScore;
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(100, value));
}

function clampPenalty(value: number): number {
  return Math.max(0, Math.min(20, value));
}

export function combineAiAndIssueScores({
  aiScore,
  issueScore,
  issueCounts,
}: CombineScoresArgs): CombinedScoreResult {
  if (
    aiScore === null ||
    aiScore === undefined ||
    Number.isNaN(aiScore) ||
    !Number.isFinite(aiScore)
  ) {
    return {
      finalScore: clampScore(Math.round(issueScore)),
      aiAdjustedScore: null,
      severityPenalty: 0,
      aiWeight: 0,
      issueWeight: 1,
    };
  }

  const normalizedAiScore = clampScore(Math.round(aiScore));

  const severityPenalty = Math.sqrt(Math.max(issueCounts.critical, 0)) * 4.5 +
    Math.sqrt(Math.max(issueCounts.high, 0)) * 2.25 +
    Math.sqrt(Math.max(issueCounts.medium, 0)) * 1.25;

  const cappedPenalty = clampPenalty(severityPenalty);
  const aiAdjustedScore = clampScore(Math.round(normalizedAiScore - cappedPenalty));

  const aiWeight = issueCounts.critical > 0 ? 0.6 : 0.8;
  const issueWeight = 1 - aiWeight;

  const blendedScore = aiAdjustedScore * aiWeight + clampScore(Math.round(issueScore)) * issueWeight;
  const finalScore = clampScore(Math.round(blendedScore));

  return {
    finalScore,
    aiAdjustedScore,
    severityPenalty: parseFloat(cappedPenalty.toFixed(2)),
    aiWeight,
    issueWeight,
  };
}

export function getScoreInterpretation(
  score: number,
  thresholds: Partial<Thresholds> | null | undefined,
): "pass" | "warning" | "fail" {
  const resolvedThresholds: Thresholds = {
    pass: thresholds?.pass ?? DEFAULT_THRESHOLDS.pass,
    warning: thresholds?.warning ?? DEFAULT_THRESHOLDS.warning,
    fail: thresholds?.fail ?? DEFAULT_THRESHOLDS.fail,
  };

  if (score >= resolvedThresholds.pass) {
    return "pass";
  }
  if (score >= resolvedThresholds.warning) {
    return "warning";
  }
  return "fail";
}


