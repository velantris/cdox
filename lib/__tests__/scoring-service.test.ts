import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCORING_CONFIG,
  calculateScore,
  combineAiAndIssueScores,
} from "../scoring-service";

describe("calculateScore", () => {
  it("returns 100 when there are no issues", () => {
    const score = calculateScore([], DEFAULT_SCORING_CONFIG);
    expect(score).toBe(100);
  });

  it("handles a single critical issue without collapsing to zero", () => {
    const score = calculateScore(
      [
        {
          severity: "critical",
          type: "clarity",
        },
      ],
      DEFAULT_SCORING_CONFIG,
    );

    expect(score).toBe(75);
  });

  it("keeps significant numbers of medium issues away from a score of 1", () => {
    const mediumIssues = Array.from({ length: 25 }, () => ({
      severity: "medium",
      type: "grammar",
    }));

    const score = calculateScore(mediumIssues, DEFAULT_SCORING_CONFIG);

    expect(score).toBe(60);
  });

  it("respects category multipliers without bottoming out the score", () => {
    const config = {
      ...DEFAULT_SCORING_CONFIG,
      categoryWeights: {
        ...DEFAULT_SCORING_CONFIG.categoryWeights,
        grammar: 1.8,
      },
    };

    const issues = Array.from({ length: 10 }, () => ({
      severity: "high",
      type: "grammar",
    }));

    const score = calculateScore(issues, config);

    expect(score).toBeGreaterThan(1);
    expect(score).toBe(36);
  });
});

describe("combineAiAndIssueScores", () => {
  it("falls back to issue score when AI score is missing", () => {
    const result = combineAiAndIssueScores({
      aiScore: null,
      issueScore: 42,
      issueCounts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    });

    expect(result.finalScore).toBe(42);
    expect(result.aiAdjustedScore).toBeNull();
    expect(result.aiWeight).toBe(0);
    expect(result.issueWeight).toBe(1);
  });

  it("keeps high AI score in a realistic range even with many high issues", () => {
    const result = combineAiAndIssueScores({
      aiScore: 55,
      issueScore: 12,
      issueCounts: {
        critical: 0,
        high: 18,
        medium: 30,
        low: 10,
      },
    });

    expect(result.finalScore).toBe(34);
    expect(result.aiAdjustedScore).toBe(39);
    expect(result.severityPenalty).toBeCloseTo(16.39, 2);
    expect(result.aiWeight).toBeCloseTo(0.8, 5);
    expect(result.issueWeight).toBeCloseTo(0.2, 5);
  });

  it("reduces AI weighting when critical issues are present", () => {
    const result = combineAiAndIssueScores({
      aiScore: 70,
      issueScore: 30,
      issueCounts: {
        critical: 4,
        high: 10,
        medium: 5,
        low: 3,
      },
    });

    expect(result.finalScore).toBe(43);
    expect(result.aiAdjustedScore).toBe(51);
    expect(result.aiWeight).toBeCloseTo(0.6, 5);
    expect(result.issueWeight).toBeCloseTo(0.4, 5);
    expect(result.severityPenalty).toBeCloseTo(18.91, 2);
  });
});


