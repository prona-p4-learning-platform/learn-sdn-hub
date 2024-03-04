import { Button, Grid } from "@mui/material";
import TransferList, { ArrayItemWithId } from "./TransferList";
import {
  arraysAreEqualById,
  intersection,
  not,
  union,
} from "../utilities/ListCompareHelper";
import { Dispatch, SetStateAction } from "react";

interface WithId {
  _id: string;
}

interface AssignmentListProps<T extends WithId> {
  unassignedItems: T[];
  assignedItems: T[];
  checked: readonly T[];
  currentCourseID: string;
  originalAssigned: T[];
  setUnassigned: Dispatch<SetStateAction<T[]>>;
  setAssigned: Dispatch<SetStateAction<T[]>>;
  setChecked: Dispatch<SetStateAction<readonly T[]>>;
  setHasChanges: Dispatch<SetStateAction<boolean>>;
  displayProperty: keyof T;
  leftListTitle: string;
  rightListTitle: string;
}

const AssignmentList = <T extends WithId>({
  unassignedItems,
  assignedItems,
  checked,
  currentCourseID,
  originalAssigned,
  setUnassigned,
  setAssigned,
  setChecked,
  setHasChanges,
  displayProperty,
  leftListTitle,
  rightListTitle,
}: AssignmentListProps<T>) => {
  const unassignedChecked = intersection(checked, unassignedItems);
  const assignedChecked = intersection(checked, assignedItems);

  const handleCheckedUnassigned = () => {
    const assigned = not(assignedItems, assignedChecked);
    setUnassigned(unassignedItems.concat(assignedChecked));
    setAssigned(assigned);
    setChecked(not(checked, assignedChecked));
    if (currentCourseID !== "")
      setHasChanges(!arraysAreEqualById(assigned, originalAssigned));
  };

  const handleToggle = (value: T) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const numberOfChecked = (items: readonly T[]) =>
    intersection(checked, items).length;

  const handleToggleAll = (items: readonly T[]) => () => {
    if (numberOfChecked(items) === items.length) {
      setChecked(not(checked, items));
    } else {
      setChecked(union(checked, items));
    }
  };

  const handleCheckedAssigned = () => {
    const assigned = assignedItems.concat(unassignedChecked);
    setAssigned(assigned);
    setUnassigned(not(unassignedItems, unassignedChecked));
    setChecked(not(checked, unassignedChecked));
    if (currentCourseID !== "")
      setHasChanges(!arraysAreEqualById(assigned, originalAssigned));
  };

  return (
    <Grid
      ml={0}
      mt={0.1}
      container
      spacing={2}
      justifyContent="center"
      alignItems="center"
    >
      <Grid item>
        <TransferList
          customListProps={{
            title: leftListTitle,
            items: unassignedItems as ArrayItemWithId<T>[],
            handleToggleAll: handleToggleAll(unassignedItems),
            numberOfChecked: numberOfChecked,
            handleToggle: handleToggle,
            checked: unassignedChecked as ArrayItemWithId<T>[],
            displayProperty: displayProperty,
          }}
        />
      </Grid>
      <Grid item>
        <Grid container direction="column" alignItems="center">
          <Button
            sx={{ my: 0.5 }}
            variant="outlined"
            size="small"
            onClick={handleCheckedAssigned}
            disabled={unassignedChecked.length === 0}
            aria-label="Add"
          >
            &gt;
          </Button>
          <Button
            sx={{ my: 0.5 }}
            variant="outlined"
            size="small"
            onClick={handleCheckedUnassigned}
            disabled={assignedChecked.length === 0}
            aria-label="Remove"
          >
            &lt;
          </Button>
        </Grid>
      </Grid>
      <Grid item>
        <TransferList
          customListProps={{
            title: rightListTitle,
            items: assignedItems as ArrayItemWithId<T>[],
            handleToggleAll: handleToggleAll(assignedItems),
            numberOfChecked: numberOfChecked,
            handleToggle: handleToggle,
            checked: assignedChecked as ArrayItemWithId<T>[],
            displayProperty: displayProperty,
          }}
        />
      </Grid>
    </Grid>
  );
};

export default AssignmentList;
