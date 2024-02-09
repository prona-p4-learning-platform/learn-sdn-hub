import React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import IconButton from "@mui/material/IconButton";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import Grid from "@mui/material/Grid";
import Tooltip from '@mui/material/Tooltip';

interface TabsProps {
  index: any;
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
      className={fullscreen ? "myTerminalTabFullscreenPanel" : "myTerminalTabPanel"}
      aria-labelledby={`terminal-tab-${index}`}
      {...other}
    >
      <div className="myTerminalContainer">
      {value === index &&
        Array.isArray(children) && children.map((child, id) =>
          <div key={id} className="myTerminal">{child}</div>
        )
      }
      </div>
    </div>
  );
}

interface TabControlProps {
  tabNames: string[];
  children?: JSX.Element[][];
}

export default function TerminalTabs(props: TabControlProps) {
  const [value, setValue] = React.useState(0);
  const [fullscreen, setFullscreen] = React.useState(false);

  const handleChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const toggleFullscreen = (_event: React.ChangeEvent<{}>) => {
    setFullscreen(!fullscreen);
  };

  return (
    <Grid className={fullscreen ? "myFullscreenTerminalTab" : "myTerminalTab"}>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="terminal tabs"
      >
        {props.tabNames && props.tabNames.map((name) => (
          <Tab label={name} key={name} />
        ))}
        <Grid container justifyContent="flex-end">
          <Tooltip title="Toggle Fullscreen" placement="left">
            <IconButton onClick={toggleFullscreen} color="primary" className="myFullscreenButton">
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Grid>
      </Tabs>

      {Array.isArray(props.children) && props.children.map((child, index) =>
        <TabPanel value={value} fullscreen={fullscreen} index={index} key={index}>
          {child}
        </TabPanel>
      )}
    </Grid>
  );
}
