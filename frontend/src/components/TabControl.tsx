import React from "react";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

interface TabsProps {
  index: any;
  value: any;
  children?: React.ReactChild | React.ReactChildren;
}

function TabPanel(props: TabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      key={`tabpanel-${index}`}
      style={{ height: (window.innerHeight - 120) + 'px' }}
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
  children?: React.ReactChild | React.ReactChild[];
}

export default function TabControl(props: TabControlProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="tabs"
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
