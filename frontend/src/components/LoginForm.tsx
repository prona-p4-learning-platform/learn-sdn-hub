import React,  {useState, useCallback} from "react";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from '@material-ui/core/Button';
import { Grid } from "@material-ui/core";
import Snackbar from '@material-ui/core/Snackbar';
import { useHistory } from "react-router-dom";
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import APIRequest from '../api/Request'
type Severity = "error" | "success" | "info" | "warning" | undefined;

function Alert(props: JSX.IntrinsicAttributes & AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}


export interface LoginFormProps{
    onSuccessfulAuthentication: (token: string, username: string) => void
}


export default function(props: LoginFormProps) {

  let history = useHistory();

  const [state , setState] = useState({
        username : "",
        password : ""
    })
    const {onSuccessfulAuthentication} = props

    const [notificationOpen, setNotificationOpen] = React.useState(false);

    const useStyles = makeStyles((theme) => ({
      root: {
        "& > *": {
          margin: theme.spacing(1),
          width: "25ch",
        },
      },
    }));
    const classes = useStyles();

    const [loginResult , setLoginResult] = useState("")
    const [loginSeverity , setLoginSeverity] = useState("error")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> ) => {
        const {id , value} = e.target   
        setState(prevState => ({
            ...prevState,
            [id] : value
        }))
    } 

    const loginRequest = useCallback(async () => {
        // Api request here
        const request = APIRequest("/api/user/login", {method: 'POST', body: JSON.stringify(state), headers: {'Content-Type': 'application/json'} })
        const result = await fetch(request)
        if (result.status === 200){
            setLoginResult("Auth successful!")
            setLoginSeverity("success")
            setNotificationOpen(true)
            const a = await result.json()
            onSuccessfulAuthentication(a.token, a.username)
            history.push("/assignments")
        } else if (result.status===401){
            setLoginResult("Auth failed!")
            setLoginSeverity("error")
            setNotificationOpen(true)
        }
    }, [state,onSuccessfulAuthentication, history]);

    const handleNotificationClose = () => {
      setNotificationOpen(false);
    };

    return (
      <form className={classes.root} noValidate autoComplete="off">
        <Grid container direction="row" justify="flex-start" alignItems="center" spacing={3}>
          <Grid item>
            <TextField id="username" label="Username" variant="outlined" onChange={handleChange} />
          </Grid>
          <Grid item>
            <TextField type="password" id="password" label="Password" variant="outlined" onChange={handleChange} />
          </Grid>
          <Grid item>
            <Button variant="contained" color="primary" onClick={loginRequest}>
                Login
            </Button>
            <Snackbar open={notificationOpen} autoHideDuration={6000} onClose={handleNotificationClose}>
              <Alert onClose={handleNotificationClose} severity={loginSeverity as Severity}>
                {loginResult}
              </Alert>
            </Snackbar>
          </Grid>
        </Grid>
      </form>
    );
  }
