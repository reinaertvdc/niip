import * as React from 'react';

export interface IDashBoardCompanyProps {
}

export interface IDashBoardCompanyState {
}

export default class DashBoardCompany extends React.Component<IDashBoardCompanyProps, IDashBoardCompanyState> {
  constructor(props: IDashBoardCompanyProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <span>
        COMPANY
      </span>
    );
  }
}
