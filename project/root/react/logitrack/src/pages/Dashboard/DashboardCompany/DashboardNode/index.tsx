import * as React from 'react';
import { Redirect } from 'react-router';
import { DASHBOARD } from '../../../../constants/routes';

export interface IDashboardNodeProps {
  match: {
    params: {
      company: string,
      id: string
    }
  }
}

export interface IDashboardNodeState {
}

export default class DashboardNode extends React.Component<IDashboardNodeProps, IDashboardNodeState> {
  constructor(props: IDashboardNodeProps) {
    super(props);

    this.state = {
    }
  }

  private async getNodeData(): Promise<void> {
    //TODO: get node data
    //TODO: update state with node data
  }

  public componentDidMount() {
    this.getNodeData();
  }

  public render() {
    let company = parseInt(this.props.match.params.company);
    if (isNaN(company)) {
      return <Redirect to={DASHBOARD} />
    }
    let id = parseInt(this.props.match.params.id);
    if (isNaN(id)) {
      return <Redirect to={DASHBOARD+'/'+company} />
    }
    return (
      <div>
        NODE
      </div>
    );
  }
}
