import * as React from 'react';
import DashBoardAdmin from './DashBoardAdmin';
import DashBoardCompany from './DashBoardCompany';
import { Link, Redirect, Switch, Route } from 'react-router-dom';

export interface IDashBoardProps {
  dashType: 'admin'|'company',
  dashId: number,
  onLogout: () => void
}

export interface IDashBoardState {
}

export default class DashBoard extends React.Component<IDashBoardProps, IDashBoardState> {
  constructor(props: IDashBoardProps) {
    super(props);

    this.state = {

    }
  }

  private onLogout = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    this.props.onLogout();
    e.preventDefault();
  }

  public render() {
    if (this.props.dashType === 'admin') {
      return (
        <div>
          <Link to="/" onClick={this.onLogout}>Logout</Link><br />
          <DashBoardAdmin />
        </div>
      );
    }
    else if (this.props.dashType === 'company') {
      console.log('REDIR');
      return (
        <Switch>
          <Route path="/dashboard/:id">
            <DashBoardCompany />
          </Route>
          <Route path="/dashboard">
            <Redirect to={'/dashboard/'+this.props.dashId} />
          </Route>
        </Switch>
      );
    }
    else {
      this.props.onLogout();
      return (
        <div></div>
      );
    }
  }
}
