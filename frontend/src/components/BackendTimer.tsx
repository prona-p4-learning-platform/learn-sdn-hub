import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

interface BackendTimerProps {
  environmentName: string;
  groupNumber?: number;
}

export default function BackendTimer({ environmentName, groupNumber }: BackendTimerProps) {
  const [value, setValue] = useState<string>("--:--");

  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const query = groupNumber !== undefined ? `?groupNumber=${groupNumber}` : "";
        const res = await fetch(`/environment/${environmentName}/timer${query}`);
        const data = await res.json();
        setValue(data.value); // z.B. { "value": "02:15" }
      } catch (e) {
        setValue("--:--");
        console.error("Failed to fetch timer:", e);
      }
    };

    // initial fetch + alle 1 Sekunde aktualisieren
    fetchTimer();
    const intervalId = setInterval(fetchTimer, 1000);
    return () => clearInterval(intervalId);
  }, [environmentName, groupNumber]);

  return (
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
  );
}
