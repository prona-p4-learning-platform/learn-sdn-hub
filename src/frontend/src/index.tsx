import React from 'react';
import ReactDOM from 'react-dom';

import Root from "./Root";
import "./main.css";
import "xterm/css/xterm.css";

ReactDOM.render(
  //<React.StrictMode>
    <Root />,
  //</React.StrictMode>,
  document.getElementById('root')
);
