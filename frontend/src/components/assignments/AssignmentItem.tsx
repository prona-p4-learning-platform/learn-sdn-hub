import { Box, Button, Checkbox, createTheme, LinearProgress, ListItem, ListItemSecondaryAction, ListItemText, Tooltip, Typography } from "@mui/material"
import CloudUploadIcon from "@mui/icons-material/CloudUpload"
import CloudOffIcon from "@mui/icons-material/CloudOff"
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite"
import { useNavigate } from "react-router"
import { AssignmentContextData } from "../../hooks"

type Props = {
  name: string
  data: AssignmentContextData
  onDeploy: (name: string) => void
  onUndeploy: (name: string) => void
  onResubmit: (name: string) => void
}


const AssignmentItem = ({name, data, onDeploy, onUndeploy, onResubmit}:Props) => {
  const theme = createTheme()
  const navigate = useNavigate()

  const isDeployedUser = data.deployedUser.includes(name)
  const submission = data.submissions.find(item => item.assignmentName === name)
  const isSubmitted = !!submission

  const isActiveDeployment = isDeployedUser
  const canDeploy = !(data.deployedUser.length > 0 || ((data.deployedGroup.length > 0) && !data.deployedGroup.includes(name)))

  const getSubmissionTooltip = () => {
    if(submission) {
      return `Finished. Last successful submission: ${submission.lastChanged}`
    }
  }

  const getPointsTooltip = () => {
    const limit = data.pointLimits[name]
    if(submission?.points) {
      return `You have earned ${submission.points} out of ${limit} bonus points.`
    }
    if(submission && !submission.points) {
      return "The submission was not graded yet"
    }
    if(limit) {
      return "You can earn bonus points by subbmiting this assignemnt!"
    }
    return "No bonus points available"
  }
  return (
    <ListItem divider>
      <ListItemText primary={name} />
      <ListItemSecondaryAction>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUploadIcon />}
          disabled={!canDeploy || isSubmitted}
          onClick={() => onDeploy(name)}
          sx={{ margin: theme.spacing(1) }}
        >
          Deploy
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<PlayCircleFilledWhiteIcon />}
          disabled={!isActiveDeployment}
          onClick={() => navigate(`/environment/${name}`)}
          sx={{ margin: theme.spacing(1) }}
        >
          Start Assignment
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudOffIcon />}
          disabled={!isActiveDeployment}
          onClick={() => onUndeploy(name)}
          sx={{ margin: theme.spacing(1) }}
        >
          Undeploy
        </Button>
        <Tooltip title={getSubmissionTooltip()}>
          <Checkbox
            edge="end"
            checked={isSubmitted}
            disabled={!isSubmitted}
            color="primary"
            onClick={() => onResubmit(name)}
          />
        </Tooltip>
        {data.pointLimits[name] ? (
          <Tooltip title={getPointsTooltip()}>
            <Box sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}>
              <Box sx={{ width: "100px" }}>
                <LinearProgress
                  variant="determinate"
                  value={submission?.points && data.pointLimits[name] ? (submission.points / data.pointLimits[name]!) * 100 : 0}
                  color={isSubmitted ? "primary" : "warning"}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {submission?.points ?? "?"} / {data.pointLimits[name]}
              </Typography>
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}
          >
            <Box sx={{ width: "158px" }}>
              <Typography variant="body2" color="text.secondary">
                No bonus points
              </Typography>
            </Box>
          </Box>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  )
}

export default AssignmentItem