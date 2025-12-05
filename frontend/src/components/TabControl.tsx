import { useState, ChangeEvent } from "react";
import {
  Box,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  Checkbox
} from "@mui/material";

import RestartAltIcon from "@mui/icons-material/RestartAlt";

interface TabsProps {
  index: number;
  value: number;
  children?: JSX.Element;
}

function TabPanel(props: TabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      key={`tabpanel-${index}`}
      style={{ height: window.innerHeight - 120 + "px" }}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={1}>
          <Typography component="span">{children}</Typography>
        </Box>
      )}
    </div>
  );
}

interface TabControlProps {
  tabNames: string[];
  children?: JSX.Element | JSX.Element[];
  handleRestart: () => void;
  environmentStatus: string;
  timerComponent?: JSX.Element;
}

export default function TabControl(props: TabControlProps): JSX.Element {
  const [value, setValue] = useState(0);
  const [showTimer, setShowTimer] = useState(true);

  const handleChange = (_event: ChangeEvent<unknown>, newValue: number) => {
    setValue(newValue);
  };

  const handleTimerCheckboxChange = (
    _event: ChangeEvent<HTMLInputElement>
  ) => {
    setShowTimer(_event.target.checked);
  };

  const handleRestartConfirmation = () => {
    props.handleRestart();
  };

  return (
    <>
      <Grid
        container
        justifyContent="flex-end"
        direction="row"
        alignItems="center"
      >
        <Tabs value={value} onChange={handleChange} aria-label="tabs">
          {props.tabNames.map((name) => (
            <Tab label={name} key={name} />
          ))}
        </Tabs>
        <Box sx={{ mx: "auto " }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mx: 2 }}>
          <Grid item sx={{ display: showTimer ? "block" : "none" }}>
            {props.timerComponent && props.timerComponent}
          </Grid>
          {props.timerComponent && (
            <>
              <Checkbox
                color="primary"
                checked={showTimer}
                onChange={handleTimerCheckboxChange}
                sx={{ ml: -1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: -1 }}>
                show timer
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ mx: "auto " }} />
        <Grid item>
          <Typography align="center" variant="body2">
            Status: {props.environmentStatus}
          </Typography>
        </Grid>
        <Grid item>
          <Tooltip title="Restart environment" placement="left">
            <IconButton color="primary" onClick={handleRestartConfirmation}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>

      {Array.isArray(props.children) &&
        props.children.map((child, index) => (
          <TabPanel value={value} index={index} key={index}>
            {child}
          </TabPanel>
        ))}
    </>
  );
}
