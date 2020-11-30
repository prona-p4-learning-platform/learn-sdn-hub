import React from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

interface EditorTabsProps {
  index: any;
  value: any;
  children?: React.ReactChild | React.ReactChildren;
}

function TabPanel(props: EditorTabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
        <Box  p={3}>
          <Typography>{children}</Typography>
        </Box>
      
    </div>
  );
}
interface TabControlProps {
  tabNames: string[];
  children?: React.ReactChild[];
}

export default function SimpleTabs(props: TabControlProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="simple tabs example"
      >
        {props.tabNames && props.tabNames.map((name) => (
          <Tab label={name} />
        ))}
      </Tabs>

      {Array.isArray(props.children) && props.children.map((child, index) => 
        <><TabPanel value={value} index={index}>
          {child}
        </TabPanel></>
      )}
    </>
  );
}
