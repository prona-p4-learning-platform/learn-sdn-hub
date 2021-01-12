import React, { useState, useEffect, useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import PlayCircleFilledWhiteIcon from '@material-ui/icons/PlayCircleFilledWhite';
import Button from "@material-ui/core/Button";
import { ListItemSecondaryAction } from '@material-ui/core';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
}));

const protocol = window && window.location && window.location.protocol;
const hostname = window && window.location && window.location.hostname;
const port = window && window.location && window.location.port;

interface AssignmentOverviewProps {
};

export default function AssignmentOverview(props: AssignmentOverviewProps) {
  const classes = useStyles();
  const [ assignments, setAssignments ] = useState([])
  const [ deployedAssignment, setDeployedAssignment ] = useState("")
  const [load, setLoad] = useState(true)  

  useEffect(() => {
    setLoad(false)
    fetch(protocol+"//"+hostname+":"+port+"/api/user/assignments", {   headers:{  authorization: localStorage.getItem("token") || ""}})
      .then(res => res.json())
      .then(setAssignments)
  },[load])

  const createEnvironment = useCallback(async (assignment: string) => {
    await fetch(`${protocol}//${hostname}:${port}/api/environment/create?environment=${assignment}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} 
    })
    setDeployedAssignment(assignment)
    
  },[]);


    return (
        <List component="nav" aria-label="assignment list" style={{width: 800}}>
          {assignments.map(assignment => (
            <>
              <ListItem>
                <ListItemText primary={assignment} />
                <ListItemSecondaryAction>
                  <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudUploadIcon />} onClick={() => createEnvironment(assignment)}>
                    Deploy
                  </Button>
                  <Button variant="contained" color="secondary" className={classes.button} startIcon={<PlayCircleFilledWhiteIcon />} disabled={assignment !== deployedAssignment} href={`/environment/${assignment}`}>
                    Start Assignment
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </>
          ))}
        </List>
    
    );
  }