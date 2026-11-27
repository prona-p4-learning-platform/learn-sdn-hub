import { Box, Button, Checkbox, CircularProgress, createTheme, LinearProgress, ListItem, ListItemSecondaryAction, ListItemText, Tooltip, Typography } from "@mui/material"
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


const AssignmentItem = ({name, data, onDeploy, onUndeploy, onResubmit}:Props): JSX.Element => {
  const theme = createTheme()
  const navigate = useNavigate()

  const isDeployedUser = data.deployedUser.includes(name)
  const submission = data.submissions.find(item => item.assignmentName === name)
  const isSubmitted = !!submission

  const isActiveDeployment = isDeployedUser
  const canDeploy = !(data.deployedUser.length > 0 || ((data.deployedGroup.length > 0) && !data.deployedGroup.includes(name)))

  const limit = data.pointLimits[name]
  const isExam = limit?.isExam ?? false

  const getSubmissionTooltip = () => {
    if(submission) {
      return `Finished. Last successful submission: ${submission.lastChanged.toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    }
  }

  const getPointsTooltip = () => {
    if(limit) {
      if(isExam && limit.maxGradePoints !== undefined) {
        if(submission?.gradePoints !== undefined) {
          return `You have earned ${submission.gradePoints} out of ${limit.maxGradePoints} points.`
        }
        if(submission) {
          return "The submission was not graded yet"
        }
        return "You can earn points by submiting this assignemnt!"
      }
      if(submission?.points) {
        return `You have earned ${submission.points} out of ${limit.maxBonusPoints} bonus points.`
      }
      if(submission) {
        return "The submission was not graded yet"
      }
      return "You can earn bonus points by subbmiting this assignemnt!"
    }
    return "No bonus points available"
  }

  const renderPointsProgress = (earned: number | undefined, max: number | undefined) => {
    if(max === undefined) {
      return null
    }
    const percentage = earned && max ? (earned / max) * 100 : 0
    // fixed-width column: ListItemSecondaryAction is right-aligned, so a
    // wider cluster would shift the buttons left relative to other rows
    return (
      <Box sx={{ display: "inline-flex", alignItems: "center", width: "180px" }}>
        <Box sx={{ width: "100px" }}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={isSubmitted ? "primary" : "warning"}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
          {earned ?? "?"} / {max}
        </Typography>
      </Box>
    )
  }
  return (
    <ListItem divider>
      <ListItemText primary={name} />
      {data.progressAssignment === name && (
        <Box sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}>
          <CircularProgress size={16} />
        </Box>
      )}
      <ListItemSecondaryAction>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUploadIcon />}
          disabled={!canDeploy || isSubmitted || data.preparing}
          onClick={() => onDeploy(name)}
          sx={{ margin: theme.spacing(1) }}
        >
          Deploy
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<PlayCircleFilledWhiteIcon />}
          disabled={!isActiveDeployment || data.preparing}
          onClick={() => void navigate(`/environment/${name}`)}
          sx={{ margin: theme.spacing(1) }}
        >
          Start Assignment
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudOffIcon />}
          disabled={!isActiveDeployment || data.preparing}
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
        {limit ? (
          <Tooltip title={getPointsTooltip()}>
            <Box sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}>
              {isExam && limit.maxGradePoints !== undefined ? (
                renderPointsProgress(submission?.gradePoints, limit.maxGradePoints)
              ) : (
                renderPointsProgress(submission?.points, limit.maxBonusPoints)
              )}
            </Box>
          </Tooltip>
        ) : (
          <Box
            sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}
          >
            <Box sx={{ width: "180px" }}>
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