import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  //TODO: change websockets for terminals in the frontend (Terminal.tsx) to support new React 18 behevior componentWillUnmount
  //
  //  see: 
  //    - https://reactjs.org/docs/strict-mode.html (With Strict Mode starting in React 18, whenever a component mounts in development, React will simulate immediately unmounting and remounting the component:)
  //    - https://reactjs.org/blog/2022/03/29/react-v18.html
  //
  //  After the update, StrictMode can be enabled again

  // <React.StrictMode>
  <App />
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
