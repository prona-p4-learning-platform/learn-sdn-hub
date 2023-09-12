import React from "react";

interface WebFrameProps {
  url: string;
}

export default class WebFrame extends React.Component<WebFrameProps> {
  
    componentDidMount() {
    }
  
    componentWillUnmount() {
      console.log("WebFrame will unmount...")
    }
  
    render() {
      return (
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/UcyNuFdPiic" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
        //<iframe src={this.props.url} width="100%" className="myTerminalTabPanel"/>
      );
    }
}
