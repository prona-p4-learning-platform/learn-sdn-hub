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
import { Typography } from "@material-ui/core";
const hostname = process.env.REACT_APP_API_HOST || ''
const wsHostname = process.env.REACT_APP_WS_HOST || ''

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
    this.state = { environmentStatus: "running",ttys: [],files: [], assignment: "" };
  }

  componentDidMount(): void{
    this.loadEnvironmentConfig()
    this.loadAssignment()
  }

  restartEnvironment(): void {
    this.setState({ environmentStatus: "restarting" });
    fetch(`${hostname}/api/environment/${this.props.match.params.environment}/restart`, {
      method: "post",
      headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} 
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.error === true) {
          this.setState({ environmentStatus: "error", error: data.message });
        } else {
          this.setState({ environmentStatus: "running" });
        }
      });
  }

  loadEnvironmentConfig(): void{
    fetch(`${hostname}/api/environment/${this.props.match.params.environment}/configuration`, 
    {headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.error !== true) {
          this.setState({ ttys: data.ttys, files: data.files });
        }
      });
  }

  loadAssignment(){
    fetch(`${hostname}/api/environment/${this.props.match.params.environment}/assignment`, 
    {headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} })
      .then((response) => response.text())
      .then((data) => {
        console.log(data);
          this.setState({ assignment: data });
      });
  }

  componentDidUpdate(){
    mermaid.init(document.querySelectorAll('code.language-mermaid'))
  }

  render(): ReactNode {
    return (
      <Grid container spacing={3}>
        <Grid item xs={6}>
        <TabControl tabNames={["Assignment", "Mininet Terminal", "Controller Terminal"]}>
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
              <Terminal
                wsEndpoint={`${wsHostname}/environment/${this.props.match.params.environment}/type/bash`}
              />
            )}            
          </Grid>
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
              <Terminal
                wsEndpoint={`${wsHostname}/environment/${this.props.match.params.environment}/type/bash2`}
              />
            )}            
          </Grid>
        </TabControl>
          <Grid item xs={12}>
            <Typography variant="body1">
              Placeholder Infrastructure display
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <div style={{ height: "500px" }}>
            <EditorTabs
              endpoints={this.state.files.map(fileAlias => 
                `${hostname}/api/environment/${this.props.match.params.environment}/file/${fileAlias}`,
              )}
            />
          </div>
        </Grid>
      </Grid>
    );
  }
}

export default withRouter(EnvironmentView);
