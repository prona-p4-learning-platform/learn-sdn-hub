import { useQuery } from "@tanstack/react-query"
import { APIRequest } from "./api/Request"
import { z } from "zod"

const EnvironmentSchema = z.enum(["normal", "k8s", "k8s-vcluster"])
const assignmentsValidator = z.array(
  z.object({
    name: z.string(),
    type: EnvironmentSchema
  })
)
const pointsValidator = z.record(z.number())
const deployedUserEnvsValidator = z.array(z.string())
const deployedGroupEnvsValidator = z.array(z.string())
const submissionsValidator = z.array(
  z.object({
    assignmentName: z.string().min(1),
    lastChanged: z.string().transform((v) => new Date(v)),
    points: z.number().optional(),
  })
)

export type AssignmentType = z.infer<typeof EnvironmentSchema>
export interface Assignment {
  name: string
  type: AssignmentType
}

export interface AssignmentContextData {
  deployedUser: string[]
  deployedGroup: string[]
  submissions: { assignmentName: string; lastChanged: Date; points?: number }[]
  pointLimits: Record<string, number | undefined>
}

export function useAssignmentsData() {
  const assignmentsQuery = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const res = await APIRequest("/user/assignments", assignmentsValidator)
      if(!res.success) {
        throw res.error
      }
      return res.data
    }
  })
  const pointsQuery = useQuery({
    queryKey: ["ponitLinits"],
    queryFn: async () => {
      const res = await APIRequest("/user/point-limits", pointsValidator)
      return res.success ? res.data : {}
    }
  })

  return { assignments: assignmentsQuery.data || [], points: pointsQuery.data || {} }
}

export function useEnvironmentStatus() {
  const refetchInterval = 2000

  const deployedUserQuery = useQuery({
    queryKey: ["deployedUserEnvs"],
    queryFn: async () => {
      const res = await APIRequest("/environment/deployed-user-environments", deployedUserEnvsValidator)
      return res.success ? res.data : []
    },
    refetchInterval
  })
  const deployedGroupQuery = useQuery({
    queryKey: ["deployedGroupEnvs"],
    queryFn: async () => {
      const res = await APIRequest("/environment/deployed-group-environments", deployedGroupEnvsValidator)
      return res.success ? res.data : []
    },
    refetchInterval
  })
  const submissionsQuery = useQuery({
    queryKey: ["submissions"],
    queryFn: async () => {
      const res = await APIRequest("/environment/submissions", submissionsValidator)
      return res.success ? res.data : []
    },
    refetchInterval
  })

  return {
    deployedUser: deployedUserQuery.data || [],
    deployedGroup: deployedGroupQuery.data || [],
    submissions: submissionsQuery.data || [],
    isLoading: deployedUserQuery.isLoading || submissionsQuery.isLoading,
    refetchAll: () => {
      void deployedUserQuery.refetch()
      void deployedGroupQuery.refetch()
    }
  }
}