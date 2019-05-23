import * as React from 'react';

export interface IDashBoardNodeProps {
}

export interface IDashBoardNodeState {
}

export default class DashBoardNode extends React.Component<IDashBoardNodeProps, IDashBoardNodeState> {
  constructor(props: IDashBoardNodeProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <div>
        NODE
      </div>
    );
  }
}
