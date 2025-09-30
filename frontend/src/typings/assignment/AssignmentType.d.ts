import { EnvironmentDescription } from "p4hsfd/src/Environment.ts";

export type Assignment = {
  _id: string;
  name: string;
  maxBonusPoints?: number;
  assignmentLabSheet?: string;
  assignmentLabSheetLocation?: "backend" | "instance" | "database";
  labSheetName?: string;
  sheetId?: string;
};

export interface NewAssignment extends EnvironmentDescription {
  _id: string;
  name: string;
  labSheetName?: string;
  sheetId?: string;
}