import React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";

interface TabsProps {
  index: any;
  value: number;
  children?: JSX.Element;
}

function TabPanel(props: TabsProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      key={`admin-tabpanel-${index}`}
      className="adminTabPanel"
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={1}>
          <div className="adminContent">{children}</div>
        </Box>
      )}
    </div>
  );
}

interface TabControlProps {
  tabNames: string[];
  children?: JSX.Element[];
}

export default function AdminTabs(props: TabControlProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Grid className="adminTab">
      <Tabs value={value} onChange={handleChange} aria-label="admin tabs">
        {props.tabNames &&
          props.tabNames.map((name) => <Tab label={name} key={name} />)}
      </Tabs>

      {Array.isArray(props.children) &&
        props.children.map((child, index) => (
          <TabPanel value={value} index={index} key={index}>
            {child}
          </TabPanel>
        ))}
    </Grid>
  );
}
