import React from "react";
import {
  Card,
  CardHeader,
  Checkbox,
  Grid,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";

type WithId = {
  _id: string;
};

export type ArrayItemWithId<T> = T extends WithId ? T : never;

export type CustomListProps<T> = {
  title: React.ReactNode;
  items: readonly ArrayItemWithId<T>[];
  handleToggleAll: () => void;
  numberOfChecked: (items: readonly ArrayItemWithId<T>[]) => number;
  handleToggle: (value: ArrayItemWithId<T>) => () => void;
  checked: ArrayItemWithId<T>[];
  displayProperty: keyof T;
};

const CustomList = <T,>({
  title,
  items,
  handleToggleAll,
  numberOfChecked,
  handleToggle,
  checked,
  displayProperty,
}: CustomListProps<T>) => (
  <Card style={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <CardHeader
      sx={{ px: 2, py: 1 }}
      avatar={
        <Checkbox
          onClick={handleToggleAll}
          checked={
            numberOfChecked(items) === items.length && items.length !== 0
          }
          indeterminate={
            numberOfChecked(items) !== items.length &&
            numberOfChecked(items) !== 0
          }
          disabled={items.length === 0}
          inputProps={{
            "aria-label": "all items selected",
          }}
        />
      }
      title={title}
      subheader={`${numberOfChecked(items)}/${items.length} selected`}
    />
    <Divider />
    <List
      sx={{
        flex: 1,
        bgcolor: "background.paper",
        overflow: "auto",
      }}
      dense
      component="div"
      role="list"
    >
      {items.map((value) => {
        const labelId = `transfer-list-all-item-${value}-label`;

        return (
          <ListItemButton
            key={value._id}
            role="listitem"
            onClick={handleToggle(value)}
          >
            <ListItemIcon>
              <Checkbox
                checked={checked.indexOf(value) !== -1}
                tabIndex={-1}
                disableRipple
                inputProps={{
                  "aria-labelledby": labelId,
                }}
              />
            </ListItemIcon>
            <ListItemText id={labelId} primary={`${value[displayProperty]}`} />
          </ListItemButton>
        );
      })}
    </List>
  </Card>
);

type TransferList<T> = {
  customListProps: CustomListProps<T>;
};

const TransferListComponent = <T,>({ customListProps }: TransferList<T>) => (
  <Grid container spacing={2} justifyContent="center" alignItems="center">
    <Grid item>{CustomList(customListProps)}</Grid>
  </Grid>
);

export default TransferListComponent;
