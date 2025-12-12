import { useEffect, useState } from "react";
import { Box, Typography, Dialog, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import { APIRequest } from "../api/Request";
import { z } from "zod";

interface BackendTimerProps {
  environmentName: string;
  groupNumber?: number;
  onTimerExpired?: () => Promise<void> | void;
}

const timerValidator = z.union([
  z.object({
    hasTimer: z.literal(false),
  }),
  z.object({
    hasTimer: z.literal(true),
    remainingMinutes: z.number(),
  }),
]);

var popupShown = false;
var fiveMinNotified = false;

function formatTime(minutes: number): string {
  const mins = Math.floor(minutes);
  const secs = Math.floor((minutes - mins) * 60);
  const minutesStr = mins.toString().padStart(2, '0');
  const secondsStr = secs.toString().padStart(2, '0');
  return `${minutesStr}:${secondsStr}`;
}

export default function BackendTimer({ environmentName, groupNumber, onTimerExpired }: BackendTimerProps) {
  const [value, setValue] = useState<string>("--:--");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const query = groupNumber !== undefined ? `?groupNumber=${groupNumber}` : "";
        const payload = await APIRequest(
          `/environment/${environmentName}/timer${query}`,
          timerValidator,
        );
        if (payload.success) {
          if (payload.data.hasTimer) {
            if (payload.data.remainingMinutes == 0 && !popupShown) {
              console.log("Zeit um, wurde abgegeben");
              if (onTimerExpired) await onTimerExpired();
              popupShown = true;
              
              setDialogOpen(true);
            }
            // wenn nur noch 5 Minuten oder weniger verbleiben, sende ein einmaliges Event
            if (payload.data.remainingMinutes <= 5 && payload.data.remainingMinutes > 0 && !fiveMinNotified) {
              fiveMinNotified = true;
              try {
                window.dispatchEvent(new CustomEvent('timer-five-min-warning', { detail: { remainingMinutes: payload.data.remainingMinutes } }));
              } catch (e) {
                console.warn('Could not dispatch timer-five-min-warning event', e);
              }
            }
            setValue(formatTime(payload.data.remainingMinutes));
          } else {
            setValue("--:--");
          }
        } else {
          setValue("--:--");
        }
      } catch (e) {
        setValue("--:--");
        console.error("Failed to fetch timer:", e);
      }
    };


    popupShown = false;
    // initial fetch + alle 1 Sekunde aktualisieren
    fetchTimer();
    const intervalId = setInterval(fetchTimer, 1000);
    return () => clearInterval(intervalId);
  }, [environmentName, groupNumber]);

  return (
    <>
      <Box
        sx={{
          px: 2,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: "#E3000F", //"rgba(255,0,0,0.1)", // optional transparenter rote Box
          //border: "2px solid red", // bei transparenter Box roter Rand
          display: "inline-block",
        }}
      >
        <Typography sx={{ color: "white", fontWeight: "bold" }}>
          {value}
        </Typography>
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        aria-describedby="alert-dialog-timer-expired-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-timer-expired-description">
            Die Prüfungszeit ist abgelaufen. Ihre Arbeit wurde automatisch abgegeben.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Finish</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
