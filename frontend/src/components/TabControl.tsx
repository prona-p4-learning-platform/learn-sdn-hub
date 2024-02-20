import React from "react";
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
}

export default function TabControl(props: TabControlProps) {
  const [value, setValue] = React.useState(0);

  const handleChange = (
    _event: React.ChangeEvent<unknown>,
    newValue: number,
  ) => {
    setValue(newValue);
  };

  const handleRestartConfirmation = () => {
    props.handleRestart();
  };

  return (
    <>
      <Tabs value={value} onChange={handleChange} aria-label="tabs">
        {props.tabNames &&
          props.tabNames.map((name) => <Tab label={name} key={name} />)}
        <Grid
          container
          justifyContent="flex-end"
          direction="row"
          alignItems="center"
        >
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
      </Tabs>

      {Array.isArray(props.children) &&
        props.children.map((child, index) => (
          <TabPanel value={value} index={index} key={index}>
            {child}
          </TabPanel>
        ))}
    </>
  );
}
