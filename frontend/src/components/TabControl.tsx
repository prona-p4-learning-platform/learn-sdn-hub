import { useState, ChangeEvent } from "react";
import {
  Box,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";

import RestartAltIcon from "@mui/icons-material/RestartAlt";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";

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
      <Box p={1}>
        <Typography component="span">{children}</Typography>
      </Box>
    </div>
  );
}

interface TabControlProps {
  tabNames: string[];
  children?: JSX.Element | JSX.Element[];
  handleRestart: () => void;
  environmentStatus: string;
  timerComponent?: JSX.Element;
  enableDetach?: boolean;
  onDetachChange?: (tabIndex: number, isDetached: boolean) => void;
  detachedTabIndex?: number | null;
}

export default function TabControl(props: TabControlProps): JSX.Element {
  const [value, setValue] = useState(0);

  const handleChange = (_event: ChangeEvent<unknown>, newValue: number) => {
    setValue(newValue);
  };

  const handleRestartConfirmation = () => {
    props.handleRestart();
  };

  const handleDetachTab = (tabIndex: number) => {
    if (props.onDetachChange) {
      props.onDetachChange(tabIndex, true);
    }
  };

  const handleReattachTab = (tabIndex: number) => {
    if (props.onDetachChange) {
      props.onDetachChange(tabIndex, false);
    }
  };

  return (
    <>
      <Grid
        container
        justifyContent="flex-end"
        direction="row"
        alignItems="center"
      >
        <Grid item>
          <Box display="flex" alignItems="center" gap={0}>
            <Tabs value={value} onChange={handleChange} aria-label="tabs">
              {props.tabNames.map((name) => (
                <Tab label={name} key={name} />
              ))}
            </Tabs>
            {props.enableDetach && (
              <>
                {props.tabNames.map((name, index) => (
                  <Box key={`detach-${index}`} display="inline-flex" alignItems="center" ml={0}>
                    {props.detachedTabIndex === index ? (
                      <Tooltip
                        title={`Reattach ${name} to main window`}
                        placement="bottom"
                      >
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleReattachTab(index)}
                        >
                          <CloseFullscreenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip
                        title={`Detach ${name} to new window`}
                        placement="bottom"
                      >
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleDetachTab(index)}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </>
            )}
          </Box>
        </Grid>
        <Box sx={{ mx: "auto " }} />
        <Grid item sx={{ flexGrow: 1, textAlign: "center" }}>
          {props.timerComponent && props.timerComponent}
        </Grid>
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
