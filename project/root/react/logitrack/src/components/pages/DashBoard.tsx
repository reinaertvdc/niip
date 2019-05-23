import * as React from 'react';

export interface IDashBoardProps {
  dashboardType: 'admin'|'company'|'node',
}

export interface IDashBoardState {
}

export default class DashBoard extends React.Component<IDashBoardProps, IDashBoardState> {
  constructor(props: IDashBoardProps) {
    super(props);

    this.state = {

    }
  }

  public render() {
    return (
      <div>
        {this.props.dashboardType} DASHBOARD
      </div>
    );
  }
}
