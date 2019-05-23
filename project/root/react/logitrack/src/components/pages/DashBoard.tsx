import * as React from 'react';
import DashBoardAdmin from './DashBoardAdmin';
import DashBoardCompany from './DashBoardCompany';
import DashBoardNode from './DashBoardNode';
import { Link } from 'react-router-dom';

export interface IDashBoardProps {
  dashboardType: 'admin'|'company'|'node',
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
    if (this.props.dashboardType === 'admin') {
      return (
        <div>
          <Link to="/" onClick={this.onLogout}>Logout</Link><br />
          <DashBoardAdmin />
        </div>
      );
    }
    else if (this.props.dashboardType === 'company') {
      return (
        <div>
          <Link to="/" onClick={this.onLogout}>Logout</Link><br />
          <DashBoardCompany />
        </div>
      );
    }
    else if (this.props.dashboardType === 'node') {
      return (
        <div>
          <Link to="/" onClick={this.onLogout}>Logout</Link><br />
          <DashBoardNode />
        </div>
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
