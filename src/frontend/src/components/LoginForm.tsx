import React,  {useState, useCallback} from "react";
import { makeStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Button from '@material-ui/core/Button';



export interface LoginFormProps{
    onSuccessfulAuthentication: (token: string, username: string) => void
}


export default function(props: LoginFormProps) {
    const [state , setState] = useState({
        username : "",
        password : ""
    })
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> ) => {
        const {id , value} = e.target   
        setState(prevState => ({
            ...prevState,
            [id] : value
        }))
    } 

    const loginRequest = useCallback(async () => {
        // Api request here
        const result = await fetch("/api/user/login", {method: 'POST', body: JSON.stringify(state), headers: {'Content-Type': 'application/json'} })
        if (result.status === 200){
            setLoginResult("Auth successful!")
            const a = await result.json()
            props.onSuccessfulAuthentication(a.token, a.username)
        } else if (result.status===401){
            setLoginResult("Auth failed")
        }
    }, [state],);



    return (
      <form className={classes.root} noValidate autoComplete="off">
        <TextField id="username" label="Outlined" variant="outlined" onChange={handleChange} />
        <TextField id="password" label="Outlined" variant="outlined" onChange={handleChange} />
        <Button variant="contained" color="primary" onClick={loginRequest}>
            Login
        </Button>
        {loginResult}
      </form>
    );
  }
