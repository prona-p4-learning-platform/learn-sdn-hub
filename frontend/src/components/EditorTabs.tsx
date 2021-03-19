import React from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import P4Editor from "./P4Editor";

interface EditorTabsProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

function TabPanel(props: EditorTabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`editor-tabpanel-${index}`}
      key={`editor-tabpanel-${index}`}
      className="myEditorContainer"
      aria-labelledby={`editor-tab-${index}`}
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
interface P4EditorTabsProps {
  tabNames: string[];
  children?: JSX.Element[];
}

export default function EditorTabs(props: P4EditorTabsProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="editor tabs"
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
