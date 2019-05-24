import * as React from 'react';
import { Link } from 'react-router-dom';
import DashBoardCompany from './DashBoardCompany';

export interface IDashBoardAdminProps {
  // dashType: 'admin'|'company'|'node',
  // dashId: number
}

export interface IDashBoardAdminState {
}

export default class DashBoardAdmin extends React.Component<IDashBoardAdminProps, IDashBoardAdminState> {
  constructor(props: IDashBoardAdminProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <div>
        <h1>Companies</h1>
        <ul>
          <li><Link to="/dashboard/1">Essers</Link></li>
          <li><Link to="/dashboard/2">DHL</Link></li>
          <li><Link to="/dashboard/3">NYK</Link></li>
          <li><Link to="/dashboard/4">BPost</Link></li>
        </ul>
        <DashBoardCompany />
      </div>
    );
  }
}
