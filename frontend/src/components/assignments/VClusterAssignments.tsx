import { Typography } from "@mui/material"
import { GroupProps } from "./NormalAssignment"
import AssignmentItem from "./AssignmentItem"

const VClusterAssignments = ({assignments, contextData, actions}:GroupProps) => {
  if(assignments.length === 0) {
    return null
  }
  return (
    <div className="group-normal">
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        vCluster Assignments
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

export default VClusterAssignments