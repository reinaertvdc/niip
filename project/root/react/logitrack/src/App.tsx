import * as React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import Login from './components/pages/Login'
import DashBoard from './components/pages/DashBoard';


export interface IAppProps {
}

export interface IAppState {
  type: 'admin'|'company'|'node',
  // id: string,
  // password: string,
  loggedIn: boolean
}

export default class App extends React.Component<IAppProps, IAppState> {
  constructor(props: IAppProps) {
    super(props);

    this.state = {
      type: 'node',
      // id: '',
      // password: '',
      loggedIn: false
    }
  }

  private setLogin = (loggedIn: boolean, type: 'admin'|'company'|'node') => {
    console.log('LOGGED IN');
    this.setState({
      type: type,
      // id: id,
      // password: password,
      loggedIn: loggedIn
    });
    console.log('LOGGED IN 2');
    console.log(this.state);
  }

  private setLogout = () => {
    this.setState({
      type: 'node',
      // id: '',
      // password: '',
      loggedIn: false
    });
  }

  public render() {
    if (this.state.loggedIn) {
      return (
        <Router>
          <Switch>
            <Route exact path="/login" component={Login}><Redirect to='/' /></Route>
            <Route path="/">
              <DashBoard onLogout={this.setLogout} dashboardType={this.state.type}></DashBoard>
            </Route>
          </Switch>
        </Router>
      );
    }
    else {
      return (
        <Router>
          <Switch>
            <Route exact path="/login">
              <Login onLogin={this.setLogin}></Login>
            </Route>
            <Route path="/"><Redirect to='/login' /></Route>
          </Switch>
        </Router>
      );
    }
  }
}
