import * as React from 'react';
import { Redirect, Switch, Route } from 'react-router';
import { DASHBOARD } from '../../../constants/routes';
import NodeList, { TruckNode } from '../../../components/NodeList';
import DashboardNode from './DashboardNode';

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

  private async getCompanyData(): Promise<void> {
    //TODO: get company data
    //TODO: update state with company data
  }

  public componentDidMount() {
    this.getNodeList();
    this.getCompanyData();
  }

  public render() {
    let id = parseInt(this.props.match.params.id);
    if (isNaN(id)) {
      return <Redirect to={DASHBOARD} />
    }
    return (
      <Switch>
        <Route exact={false} path={DASHBOARD+'/:company/:id'} render={(props) => {return (
          <div>
            <NodeList nodes={this.state.nodes} />
            <hr />
            <DashboardNode {...props} />
          </div>
        )}} />
        <Route exact={true} path={DASHBOARD+'/:company'}><NodeList nodes={this.state.nodes} /></Route>
        <Route exact={false} path={DASHBOARD+'/:company'}><Redirect to={DASHBOARD} /></Route>
      <NodeList nodes={this.state.nodes} />
      </Switch>
    );
  }
}
