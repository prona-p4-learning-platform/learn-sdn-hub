import React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import IconButton from "@mui/material/IconButton";
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import OpenInNewOffIcon from '@mui/icons-material/OpenInNewOff';
import Grid from "@mui/material/Grid";
import Tooltip from '@mui/material/Tooltip';
import { createRoot } from "react-dom/client";

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
  const [ value, setValue ] = React.useState(0);
  const [ fullscreen, setFullscreen ] = React.useState(false);
  const [ popout, setPopout ] = React.useState(false);


  const container = document.createElement("div")

  const newWindow = React.useRef<any>(null);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  const toggleFullscreen = (event: React.ChangeEvent<{}>) => {
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
          <Tooltip title="Create popout" placement="left">
            <IconButton
              onClick={() => {
                setPopout(true);
                if (container) {
                  newWindow.current = window.open(
                    "",
                    "",
                    "width=600, height=400, left=200, top=200"
                  );
                  const curWindow = newWindow.current;

                  // Erstelle ein HTML-Dokument im Popup-Fenster
                  curWindow.document.open();
                  curWindow.document.write('<html><head><title>Popout Window</title></head><body>');
                  
                  // Übertrage den Inhalt aus props.children ins Popup-Fenster
                  props.children?.forEach((child, index) => {
                    const container = document.createElement('div');
                    container.className = fullscreen ? "myFullscreenTerminalTab" : "myTerminalTab";
                  
                    // Erstelle ein React-Root und rendere das React-Element darin
                    const root = createRoot(container);
                    root.render(
                      React.createElement(TabPanel, { value, fullscreen, index, key: index }, child)
                    );
                  
                    // Füge das gerenderte React-Element in das Popup-Fenster ein
                    curWindow.document.body.appendChild(container);
                  });
                  

                  // Schließe das HTML-Dokument im Popup-Fenster
                  curWindow.document.write('</body></html>');
                  curWindow.document.close();

                  // Schließe das Popup-Fenster, wenn es geschlossen wird
                  curWindow.onunload = () => {
                    setPopout(false);
                    newWindow.current = null;
                  };
                }
              }}
              color="primary"
              className="myFullscreenButton"
            >
              {popout ? <OpenInNewOffIcon /> : <OpenInNewIcon />}
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
