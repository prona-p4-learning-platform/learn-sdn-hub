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
  enableDetach?: boolean;
  onDetachChange?: (tabIndex: number, isDetached: boolean) => void;
}

export default function TabControl(props: TabControlProps): JSX.Element {
  const [value, setValue] = useState(0);
  const [detachedTabs, setDetachedTabs] = useState<Set<number>>(new Set());

  const handleChange = (_event: ChangeEvent<unknown>, newValue: number) => {
    setValue(newValue);
  };

  const handleRestartConfirmation = () => {
    props.handleRestart();
  };

  const handleDetachTab = (tabIndex: number) => {
    const newDetached = new Set(detachedTabs);
    newDetached.add(tabIndex);
    setDetachedTabs(newDetached);
    props.onDetachChange?.(tabIndex, true);
  };

  const handleReattachTab = (tabIndex: number) => {
    const newDetached = new Set(detachedTabs);
    newDetached.delete(tabIndex);
    setDetachedTabs(newDetached);
    props.onDetachChange?.(tabIndex, false);
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
          {props.tabNames.map((name, index) => {
            const isDetached = detachedTabs.has(index);
            const tab = (
              <Tab 
                label={name} 
                disabled={isDetached}
              />
            );
            
            return isDetached ? (
              <Tooltip 
                key={name}
                title={`${name} is detached to a separate window`}
                placement="bottom"
              >
                <span>{tab}</span>
              </Tooltip>
            ) : (
              <span key={name}>{tab}</span>
            );
          })}
        </Tabs>
        <Box sx={{ mx: "auto " }} />
        {props.enableDetach && value < props.tabNames.length && (
          <Grid item>
            {!detachedTabs.has(value) ? (
              <Tooltip title={`Detach ${props.tabNames[value]} to new window`} placement="left">
                <IconButton 
                  color="primary" 
                  onClick={() => handleDetachTab(value)}
                  size="small"
                >
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={`Reattach ${props.tabNames[value]} to main window`} placement="left">
                <IconButton 
                  color="primary" 
                  onClick={() => handleReattachTab(value)}
                  size="small"
                >
                  <CloseFullscreenIcon />
                </IconButton>
              </Tooltip>
            )}
          </Grid>
        )}
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
