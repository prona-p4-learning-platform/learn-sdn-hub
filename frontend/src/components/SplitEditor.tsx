import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { NewAssignment } from "../typings/assignment/AssignmentType";
import { Tabs, Tab, Box } from "@mui/material";
import { useOptionsStore } from "../stores/optionsStore.ts";

interface SplitEditorProps {
  newAssignment: Partial<NewAssignment> | null;
  setNewAssignment: React.Dispatch<React.SetStateAction<Partial<NewAssignment | null>>>;
}

export default function SplitEditor({ newAssignment, setNewAssignment }: SplitEditorProps): JSX.Element {
  const [leftWidth, setLeftWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "split" | "preview">("split");
  const { darkMode } = useOptionsStore();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue as "editor" | "split" | "preview");
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = e.clientX - startX.current;
      setLeftWidth(startWidth.current + deltaX);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = leftWidth;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const handleEditorChange = (value?: string) => {
    setNewAssignment((prev) => ({
      ...prev,
      assignmentLabSheet: value ?? ""
    }));
  };

  return (
    <Box
      sx={{
        height: 500,
        display: "flex",
        flexDirection: "column",
        width: 600,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "action.disabled",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Editor" value="editor" />
        <Tab label="Editor & Preview" value="split" />
        <Tab label="Preview" value="preview" />
      </Tabs>
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        {activeTab === "editor" && (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={newAssignment?.assignmentLabSheet}
              theme={darkMode ? "vs-dark" : "vs-light"}
              onChange={handleEditorChange}
            />
          </Box>
        )}
        {activeTab === "split" && (
          <>
            <Box sx={{ width: leftWidth, height: "100%", minHeight: 0 }}>
              <Editor
                width="100%"
                defaultLanguage="markdown"
                value={newAssignment?.assignmentLabSheet}
                theme={darkMode ? "vs-dark" : "vs-light"}
                onChange={handleEditorChange}
              />
            </Box>
            <Box
              sx={{
                width: 3,
                flexShrink: 0,
                cursor: "col-resize",
                backgroundColor: isResizing ? "darkgray" : "lightgray",
              }}
              onMouseDown={handleMouseDown}
            />
            <Box
              ref={previewRef}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <ReactMarkdown className="markdown">
                  {newAssignment?.assignmentLabSheet}
                </ReactMarkdown>
              </Box>
            </Box>
          </>
        )}
        {activeTab === "preview" && (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                p: 1,
              }}
            >
              <ReactMarkdown className="markdown">
                {newAssignment?.assignmentLabSheet}
              </ReactMarkdown>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
