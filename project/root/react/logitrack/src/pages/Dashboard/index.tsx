import * as React from "react";
import { withAuthorization } from "../../firebase/withAuthorization";
import { Switch, Route, Redirect } from "react-router-dom";
import DashboardCompany from "./DashboardCompany";
import { DASHBOARD } from "../../constants/routes";
import CompanyList, { Company } from "../../components/CompanyList";

interface DashboardComponentState {
  companies: Array<Company>
}

class DashboardComponent extends React.Component<{}, DashboardComponentState> {
  constructor(props: any) {
    super(props);

    this.state = {
      companies: []
    };
  }

  public componentDidMount() {
    this.getCompanyList();
  }

  private async getCompanyList(): Promise<void> {
    //TODO: replace temporary return with actual GET request to API
    this.setState({
      companies: [
        {id: 1, name: 'bedrijf A'},
        {id: 2, name: 'bedrijf B'},
        {id: 3, name: 'bedrijf C'},
        {id: 4, name: 'bedrijf D'},
        {id: 5, name: 'bedrijf E'},
        {id: 6, name: 'bedrijf F'}
      ]
    });
  }

  public render() {
    return (
      <Switch>
        <Route exact={false} path={DASHBOARD+'/:id'} render={(props)=>{return (
          <div>
            <CompanyList companies={this.state.companies} />
            <hr />
            <DashboardCompany {...props} />
          </div>
        )}} />
        <Route exact={true} path={DASHBOARD}><CompanyList companies={this.state.companies} /></Route>
        <Route exact={false} path={DASHBOARD}><Redirect to={DASHBOARD} /></Route>
      </Switch>
    );
  }
}

const authCondition = (authUser: any) => !!authUser;

export const Dashboard = withAuthorization(authCondition)(DashboardComponent);
