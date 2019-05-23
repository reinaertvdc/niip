import * as React from 'react';

export interface IDashBoardAdminProps {
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
      <span>
        ADMIN
      </span>
    );
  }
}
