import { validatePointsAgainstLimits } from "../../src/routes/admin";

describe("validatePointsAgainstLimits", () => {
  it("accepts points within the bonus limit", () => {
    expect(
      validatePointsAgainstLimits({ points: 5 }, { maxBonusPoints: 10 }),
    ).toBeUndefined();
  });

  it("rejects points above the bonus limit", () => {
    expect(
      validatePointsAgainstLimits({ points: 11 }, { maxBonusPoints: 10 }),
    ).toBe("Points must be between 0 and 10");
  });

  it("accepts grade points within the grade limit", () => {
    expect(
      validatePointsAgainstLimits(
        { gradePoints: 40 },
        { maxGradePoints: 40 },
      ),
    ).toBeUndefined();
  });

  it("rejects grade points above the grade limit", () => {
    expect(
      validatePointsAgainstLimits(
        { gradePoints: 41 },
        { maxGradePoints: 40 },
      ),
    ).toBe("Grade points must be between 0 and 40");
  });

  it("validates both values independently", () => {
    expect(
      validatePointsAgainstLimits(
        { points: 11, gradePoints: 2 },
        { maxBonusPoints: 10, maxGradePoints: 40 },
      ),
    ).toBe("Points must be between 0 and 10");
    expect(
      validatePointsAgainstLimits(
        { points: 2, gradePoints: 41 },
        { maxBonusPoints: 10, maxGradePoints: 40 },
      ),
    ).toBe("Grade points must be between 0 and 40");
  });

  it("does not enforce limits that are not defined", () => {
    expect(validatePointsAgainstLimits({ points: 100 }, {})).toBeUndefined();
    expect(
      validatePointsAgainstLimits({ gradePoints: 100 }, { maxBonusPoints: 10 }),
    ).toBeUndefined();
  });

  it("does not enforce a value that was not updated", () => {
    // awarding only bonus points must not be blocked by the grade limit
    // and vice versa
    expect(
      validatePointsAgainstLimits(
        { points: 5 },
        { maxBonusPoints: 10, maxGradePoints: 0 },
      ),
    ).toBeUndefined();
    expect(
      validatePointsAgainstLimits(
        { gradePoints: 20 },
        { maxBonusPoints: 0, maxGradePoints: 40 },
      ),
    ).toBeUndefined();
  });
});
