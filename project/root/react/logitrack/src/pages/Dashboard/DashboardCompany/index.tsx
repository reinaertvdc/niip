import * as React from 'react';
import { Redirect } from 'react-router';
import { DASHBOARD } from '../../../constants/routes';

export interface IDashboardCompanyProps {
  match:{
    params: {
      id: string
    }
  }
}

export interface IDashboardCompanyState {
}

export default class DashboardCompany extends React.Component<IDashboardCompanyProps, IDashboardCompanyState> {
  constructor(props: IDashboardCompanyProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    let id = parseInt(this.props.match.params.id);
    if (isNaN(id)) {
      return <Redirect to={DASHBOARD} />
    }
    return (
      <div>COMPANY</div>
    );
  }
}
