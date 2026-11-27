import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, expect, it, vi } from "vitest"
import type { AssignmentContextData } from "../../hooks"
import AssignmentItem from "./AssignmentItem"

const renderItem = (data: AssignmentContextData, name = "exam-1") =>
  render(
    <MemoryRouter>
      <AssignmentItem
        name={name}
        data={data}
        onDeploy={vi.fn()}
        onUndeploy={vi.fn()}
        onResubmit={vi.fn()}
      />
    </MemoryRouter>,
  )

const baseData = (overrides: Partial<AssignmentContextData> = {}): AssignmentContextData => ({
  deployedUser: [],
  deployedGroup: [],
  preparing: false,
  progressAssignment: "",
  submissions: [],
  pointLimits: {},
  ...overrides,
})

const openPointsTooltip = async (label: RegExp) => {
  await userEvent.hover(screen.getByText(label))
  return screen.findByRole("tooltip")
}

describe("AssignmentItem points wording", () => {
  it("non-exam assignment keeps the bonus points wording", async () => {
    const data = baseData({
      submissions: [{ assignmentName: "lab-1", lastChanged: new Date(), points: 5 }],
      pointLimits: { "lab-1": { maxBonusPoints: 10, isExam: false } },
    })
    renderItem(data, "lab-1")

    // visible progress label has no "points" suffix (today's wording)
    expect(screen.getByText("5 / 10")).toBeInTheDocument()

    const tooltip = await openPointsTooltip(/5 \/ 10/)
    expect(tooltip).toHaveTextContent("You have earned 5 out of 10 bonus points.")
  })

  it("exam assignment shows points wording in a single bar", async () => {
    const data = baseData({
      submissions: [
        { assignmentName: "exam-1", lastChanged: new Date(), points: 5, gradePoints: 20 },
      ],
      pointLimits: {
        "exam-1": { maxBonusPoints: 5, maxGradePoints: 40, isExam: true },
      },
    })
    renderItem(data, "exam-1")

    // grade points are the only student-visible bar, worded as "points" — never "bonus points"
    expect(screen.getByText("20 / 40 points")).toBeInTheDocument()
    // bonus points are examiner-only: no bonus bar, no bonus wording
    expect(screen.queryByText(/bonus points/)).not.toBeInTheDocument()

    const tooltip = await openPointsTooltip(/20 \/ 40 points/)
    expect(tooltip).toHaveTextContent("You have earned 20 out of 40 points.")
    expect(tooltip).not.toHaveTextContent("bonus points")
  })

  it("exam without a graded submission still renders sensibly", async () => {
    const data = baseData({
      submissions: [{ assignmentName: "exam-1", lastChanged: new Date() }],
      pointLimits: {
        "exam-1": { maxBonusPoints: 5, maxGradePoints: 40, isExam: true },
      },
    })
    renderItem(data, "exam-1")

    expect(screen.getByText("? / 40 points")).toBeInTheDocument()

    const tooltip = await openPointsTooltip(/\? \/ 40 points/)
    expect(tooltip).toHaveTextContent("The submission was not graded yet")
  })

  it("exam without grade points falls back to the bonus bar", () => {
    const data = baseData({
      submissions: [{ assignmentName: "exam-1", lastChanged: new Date(), points: 5 }],
      pointLimits: {
        "exam-1": { maxBonusPoints: 5, isExam: true },
      },
    })
    renderItem(data, "exam-1")

    expect(screen.getByText("5 / 5")).toBeInTheDocument()
    expect(screen.queryByText(/\/ 40/)).not.toBeInTheDocument()
  })
})
