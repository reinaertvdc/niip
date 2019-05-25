import * as React from 'react';
import { Redirect } from 'react-router';
import { DASHBOARD } from '../../../constants/routes';
import NodeList, { TruckNode } from '../../../components/NodeList';

export interface IDashboardCompanyProps {
  match: {
    params: {
      id: string
    }
  }
}

export interface IDashboardCompanyState {
  nodes: Array<TruckNode>
}

export default class DashboardCompany extends React.Component<IDashboardCompanyProps, IDashboardCompanyState> {
  constructor(props: IDashboardCompanyProps) {
    super(props);

    this.state = {
      nodes: []
    }
  }

  private async getNodeList(): Promise<void> {
    this.setState({
      nodes: [
        {company: 1, id: 1},
        {company: 1, id: 2},
        {company: 1, id: 3},
        {company: 1, id: 4},
        {company: 1, id: 5},
        {company: 1, id: 6}
      ]
    });
  }

  public componentDidMount() {
    this.getNodeList();
  }

  public render() {
    let id = parseInt(this.props.match.params.id);
    if (isNaN(id)) {
      return <Redirect to={DASHBOARD} />
    }
    return (
      <NodeList nodes={this.state.nodes} />
    );
  }
}
