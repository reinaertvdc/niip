import * as React from 'react';
import { Switch, Route, match, Link, Redirect } from 'react-router-dom';

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

  private renderCompany = ( {match} : {match: match<{id:string}>} ) => {
    let id: number = parseInt(match.params.id);
    return (
      <div>
        <h1>Trucks</h1>
        <ul>
          <li><Link to={'/dashboard/'+id+'/1'}>Truck 1</Link></li>
          <li><Link to={'/dashboard/'+id+'/2'}>Truck 2</Link></li>
          <li><Link to={'/dashboard/'+id+'/3'}>Truck 3</Link></li>
          <li><Link to={'/dashboard/'+id+'/4'}>Truck 4</Link></li>
        </ul>
      </div>
    );
  }

  public render() {
    return (
      <Switch>
        <Route path="/dashboard/:id" component={this.renderCompany} />
        <Route path="*"><Redirect to="/dashboard" /></Route>
      </Switch>
    );
  }
}
