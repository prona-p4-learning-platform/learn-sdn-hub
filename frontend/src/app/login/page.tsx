'use client';
import React, { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react';
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { useNotification } from '@lib/context/NotificationContext';

const LoginPage = () => {

  const [ username, setUsername ] = useState('');
  const [ password, setPassword ] = useState('');
  const [ isInvalid, setIsInvalid ] = useState(false);

  const { showNotification } = useNotification();

  const handleLogin = async () => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        username: username,
        password: password,
      });
      if (result?.error) {
        // Fehlerbehandlung, z.B. ungültige Anmeldeinformationen
        console.log(result.error);
        showNotification(result.error, 'error');
        setPassword("");
        setIsInvalid(true);
      } else {
        // Weiterleitung oder Aktualisierung der Benutzeroberfläche nach erfolgreicher Anmeldung
        console.log('Erfolgreich angemeldet');
        showNotification('Erfolgreich angemeldet', 'success');
        setIsInvalid(false);
      }
    } catch (e) {
      showNotification('Ein Fehler ist aufgetreten', 'error');
      console.log(e)
    }
  }

  return (
    <Box sx={{
      width: '25%',
      margin: 'auto',
      marginTop: '10%',
    }} >
      <TextField id="username" name="username" label="Username" margin="normal" fullWidth required autoFocus autoComplete="username" onChange={(e) => setUsername(e.target.value)} />
      <TextField id="password" name="password" label="Password" margin="normal" fullWidth required autoComplete="current-password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        onClick={handleLogin}
      >
        Login
      </Button>
    </Box>
  )
}

export default LoginPage