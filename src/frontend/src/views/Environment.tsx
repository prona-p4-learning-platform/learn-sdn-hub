import * as React from "react";
import Grid from "@material-ui/core/Grid";
import Terminal from "../components/Terminal";
import EditorTabs from "../components/EditorTabs";
import { withRouter } from "react-router-dom";
import { RouteComponentProps } from "react-router";
import Button from "@material-ui/core/Button";
import { ReactNode } from "react";

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType> & {};

interface State {
  environmentStatus: string;
  ttys: string[];
  files: string[];
}

export class EnvironmentView extends React.Component<PropsType> {
  public state: State;
  constructor(props: PropsType) {
    super(props);
    this.state = { environmentStatus: "running",ttys: [],files: [] };
  }

  componentDidMount(): void{
    this.loadEnvironmentConfig()
  }

  restartEnvironment(): void {
    this.setState({ environmentStatus: "restarting" });
    fetch(`/api/environment/${this.props.match.params.environment}/restart`, {
      method: "post",
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
    fetch(`/api/environment/${this.props.match.params.environment}/configuration`)
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data.error !== true) {
          this.setState({ ttys: data.ttys, files: data.files });
        }
      });
  }

  render(): ReactNode {
    console.log(this.state.files)
    return (
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <Grid item xs={12}>
            Placeholder Infrastructure display
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
          </Grid>
          <Grid item xs={12}>
            {this.state.environmentStatus === "running" && (
              <Terminal
                wsEndpoint={`ws://${document.location.host}/environment/${this.props.match.params.environment}/type/bash`}
              />
            )}
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
