import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Terminal from "../components/Terminal";
import EditorTabs from "../components/EditorTabs";
import { withRouter } from "react-router-dom";
import { RouteComponentProps } from "react-router";
import Button from "@material-ui/core/Button";
import { ReactNode } from "react";
import ReactMarkdown from 'react-markdown'
import mermaid from 'mermaid'
import TabControl from '../components/TabControl'
import APIRequest from '../api/Request'

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType> & {};

interface State {
  environmentStatus: string;
  ttys: string[];
  files: string[];
  assignment: ""
}

export class EnvironmentView extends React.Component<PropsType> {
  public state: State;

  constructor(props: PropsType) {
    super(props);
    this.state = { environmentStatus: "running", ttys: [], files: [], assignment: "" };
  }

  componentDidMount(): void {
    this.loadEnvironmentConfig()
    this.loadAssignment()
  }

  restartEnvironment(): void {
    this.setState({ environmentStatus: "restarting" });
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/restart`, {
      method: "post",
      headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
    }))
      .then((response) => response.json())
      .then((data) => {
        if (data.error === true) {
          this.setState({ environmentStatus: "error", error: data.message });
        } else {
          this.setState({ environmentStatus: "running" });
        }
      });
  }

  loadEnvironmentConfig(): void {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/configuration`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.json())
      .then((data) => {
        if (data.error !== true) {
          this.setState({ ttys: data.ttys, files: data.files });
        }
      });
  }

  loadAssignment() {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/assignment`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.text())
      .then((data) => {
          this.setState({ assignment: data });
      });
  }

  componentDidUpdate() {
    mermaid.init(document.querySelectorAll('code.language-mermaid'))
  }

  render(): ReactNode {
    const terminals = this.state.ttys.map((alias: string) => <Terminal
      wsEndpoint={`/environment/${this.props.match.params.environment}/type/${alias}`}
    />)
    return (
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <TabControl tabNames={["Assignment", "Terminals"]}>
            <ReactMarkdown
              source={this.state.assignment}
            />
            <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={(): void => this.restartEnvironment()}
            >
              Reload environment and apply changes
            </Button>
            <h5>Environment status: {this.state.environmentStatus}</h5>
            {this.state.environmentStatus === "running" && (
              <TabControl tabNames={this.state.ttys}>{terminals}</TabControl>
            )}            
          </Grid>
        </TabControl>/
          <Grid item xs={12}>    
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <div style={{ height: "500px" }}>
            <EditorTabs
              endpoints={this.state.files.map(fileAlias =>
                `/api/environment/${this.props.match.params.environment}/file/${fileAlias}`,
              )}
            />
          </div>
        </Grid>
      </Grid>
    );
  }
}

export default withRouter(EnvironmentView);
