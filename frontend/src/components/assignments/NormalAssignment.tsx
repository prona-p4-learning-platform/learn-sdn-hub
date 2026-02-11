import { Typography } from "@mui/material"
import { Assignment, AssignmentContextData } from "../../hooks"
import AssignmentItem from "./AssignmentItem"

export type GroupProps = {
  assignments: Assignment[]
  contextData: AssignmentContextData
  actions: {
    deploy: (name: string) => void
    undeploy: (name: string) => void
    resubmit: (name: string) => void
  }
}

const NormalAssignment = ({assignments, contextData, actions}:GroupProps) => {

  if(assignments.length === 0) {
    return null
  }
  
  return (
    <div className="group-normal">
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Assignments
      </Typography>
      {assignments.map(item => (
        <AssignmentItem
          key={item.name}
          name={item.name}
          data={contextData}
          onDeploy={actions.deploy}
          onUndeploy={actions.undeploy}
          onResubmit={actions.resubmit}
        />
      ))}
    </div>
  )
}

export default NormalAssignment