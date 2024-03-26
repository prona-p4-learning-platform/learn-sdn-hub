'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { AlertColor } from '@mui/material/Alert';

type NotificationContextType = {
  showNotification: (message: string, severity?: AlertColor) => void;
  closeNotification: () => void;
};

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [ notification, setNotification ] = useState({
    open: false,
    message: '',
    severity: 'info' as AlertColor,
  });

  const showNotification = useCallback((message: string, severity: AlertColor = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  const closeNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={closeNotification}
      >
        <Alert variant='filled' onClose={closeNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};
