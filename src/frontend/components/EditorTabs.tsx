import React from "react";
import { makeStyles, Theme } from "@material-ui/core/styles";
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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: any) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
}));

interface P4EditorTabsProps {
  endpoints: Array<string>;
}

export default function SimpleTabs(props: P4EditorTabsProps) {
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
        {props.endpoints.map((endpoint) => (
          <Tab label={endpoint.split("/").slice(-1)} />
        ))}
      </Tabs>
      {props.endpoints.map((endpoint, index) => (
        <TabPanel value={value} index={index}>
          <P4Editor endpoint={endpoint} />
        </TabPanel>
      ))}
    </>
  );
}
