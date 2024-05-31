import { useState, ChangeEvent } from "react";
import { Box, Grid, IconButton, Tab, Tabs, Tooltip } from "@mui/material";

import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

interface TabsProps {
  index: number;
  value: number;
  fullscreen: boolean;
  children?: JSX.Element[];
}

function TabPanel(props: TabsProps) {
  const { children, value, fullscreen, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`terminal-tabpanel-${index}`}
      key={`terminal-tabpanel-${index}`}
      className={
        fullscreen ? "myTerminalTabFullscreenPanel" : "myTerminalTabPanel"
      }
      aria-labelledby={`terminal-tab-${index}`}
      {...other}
    >
      <div className="myTerminalContainer">
        {value === index &&
          Array.isArray(children) &&
          children.map((child, id) => (
            <div key={id} className="myTerminal">
              {child}
            </div>
          ))}
      </div>
    </div>
  );
}

interface TabControlProps {
  tabNames: string[];
  children?: JSX.Element[][];
}

export default function TerminalTabs(props: TabControlProps): JSX.Element {
  const [value, setValue] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const handleChange = (_event: ChangeEvent<unknown>, newValue: number) => {
    setValue(newValue);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  return (
    <Grid className={fullscreen ? "myFullscreenTerminalTab" : "myTerminalTab"}>
      <Grid container justifyContent="flex-end">
        <Tabs value={value} onChange={handleChange} aria-label="terminal tabs">
          {props.tabNames.map((name) => (
            <Tab label={name} key={name} />
          ))}
        </Tabs>
        <Box sx={{ mx: "auto " }} />
        <Tooltip title="Toggle Fullscreen" placement="left">
          <IconButton
            onClick={toggleFullscreen}
            color="primary"
            className="myFullscreenButton"
          >
            {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        </Tooltip>
      </Grid>

      {Array.isArray(props.children) &&
        props.children.map((child, index) => (
          <TabPanel
            value={value}
            fullscreen={fullscreen}
            index={index}
            key={index}
          >
            {child}
          </TabPanel>
        ))}
    </Grid>
  );
}
