import * as React from "react";
import MonacoEditor, {
  EditorDidMount,
  ChangeHandler,
} from "react-monaco-editor";
import Grid from "@material-ui/core/Grid";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";

export interface HelloProps {
  compiler: string;
  framework: string;
}

interface State {
  code: string;
}

export default class Hello extends React.Component {
  public state: State;
  constructor(props: object) {
    super(props);
    this.state = {
      code: "// type your code...",
    };
  }

  editorDidMount: EditorDidMount = (editor, monaco) => {
    console.log("editorDidMount", editor);
    editor.focus();
  };

  onChange: ChangeHandler = (newValue, e) => {
    console.log("onChange", newValue, e);
  };

  render() {
    const code = this.state.code;
    const options = {
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      automaticLayout: true,
    };
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
            ></IconButton>
          </Toolbar>
        </AppBar>
        <Grid container spacing={3}>
          <Grid item xs={6}>
            <Grid item xs={12}>
              Placeholder Infrastructure display
            </Grid>
            <Grid item xs={12}>
              Placeholder mininet CLI interface
            </Grid>
          </Grid>
          <Grid item xs={6}>
            <MonacoEditor
              height="400"
              language="javascript"
              value={code}
              options={options}
              onChange={this.onChange}
              editorDidMount={this.editorDidMount}
            />
          </Grid>
        </Grid>
      </>
    );
  }
}
