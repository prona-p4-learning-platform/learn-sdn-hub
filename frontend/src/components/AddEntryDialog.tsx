import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

interface AddEntryDialogProps {
  open: boolean;
  onClose?: () => void;
  onSubmit: (data: Record<string, string>) => void;
  title: string;
  description: string;
  label: string;
}

const AddEntryDialog: React.FC<AddEntryDialogProps> = ({
  open,
  onClose = () => {
    open = false;
  },
  onSubmit,
  title,
  description,
  label,
}) => {
  const [inputValue, setInputValue] = useState("");
  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (!(value instanceof File)) formJson[key] = value.toString();
    });
    onSubmit(formJson);
    handleClose();
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        component: "form",
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{description}</DialogContentText>
        <TextField
          autoFocus
          required
          margin="dense"
          fullWidth
          variant="standard"
          label={label}
          id="dialog_add_entry"
          name="dialog_add_entry"
          value={inputValue}
          onChange={handleChange}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit">Submit</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEntryDialog;
