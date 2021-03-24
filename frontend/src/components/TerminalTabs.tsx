import React from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

interface TabsProps {
  index: any;
  value: any;
  children?: JSX.Element[];
}

function TabPanel(props: TabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`terminal-tabpanel-${index}`}
      key={`terminal-tabpanel-${index}`}
      className="myTerminalTab"
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

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="terminal tabs"
      >
        {props.tabNames && props.tabNames.map((name) => (
          <Tab label={name} key={name} />
        ))}
      </Tabs>

      {Array.isArray(props.children) && props.children.map((child, index) =>
        <TabPanel value={value} index={index} key={index}>
          {child}
        </TabPanel>
      )}
    </>
  );
}
