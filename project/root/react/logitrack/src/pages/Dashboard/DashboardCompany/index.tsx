import * as React from 'react';
import { Redirect, Switch, Route } from 'react-router';
import { DASHBOARD } from '../../../constants/routes';
import NodeList, { TruckNode } from '../../../components/NodeList';
import DashboardNode from './DashboardNode';
import NodeGoogleMap, { NodeLocation } from '../../../components/NodeGoogleMap';

export interface IDashboardCompanyProps {
  match: {
    params: {
      id: string
    }
  }
}

export interface IDashboardCompanyState {
  nodes: Array<TruckNode>
  locations: Array<NodeLocation>
}

export default class DashboardCompany extends React.Component<IDashboardCompanyProps, IDashboardCompanyState> {
  constructor(props: IDashboardCompanyProps) {
    super(props);

    this.state = {
      nodes: [],
      locations: []
    }
  }

  private async getNodeList(): Promise<void> {
    //TODO: remove timeout
    //TODO: replace with actual API call
    setTimeout(() => {
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
    }, 1500);
  }

  private async getNodeLocations(): Promise<void> {
    //TODO: remove timeout
    //TODO: replace with actual API call
    setTimeout(() => {
      this.setState({
        locations: [
          {id:1, lbl:'Truck 1', lat:50.9312154+(Math.random()/5)-0.1, lng:5.3935026+(Math.random()/5)-0.1},
          {id:2, lbl:'Truck 2', lat:50.9263313+(Math.random()/5)-0.1, lng:5.3912442+(Math.random()/5)-0.1},
          {id:3, lbl:'Truck 3', lat:51.0796581+(Math.random()/5)-0.1, lng:5.6826122+(Math.random()/5)-0.1}
        ]
      })
    }, 5000);
    setTimeout(this.getNodeLocations.bind(this), 15000);
  }

  private async getCompanyData(): Promise<void> {
    //TODO: get company data
    //TODO: update state with company data
  }

  public componentDidMount() {
    this.getNodeList();
    this.getCompanyData();
    this.getNodeLocations();
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
        <Route exact={true} path={DASHBOARD+'/:company'}>
          <NodeList nodes={this.state.nodes} />
          <NodeGoogleMap locations={this.state.locations} />
        </Route>
        <Route exact={false} path={DASHBOARD+'/:company'}><Redirect to={DASHBOARD} /></Route>
      {/* <NodeList nodes={this.state.nodes} /> */}
      </Switch>
    );
  }
}
