import * as React from "react";
import { withAuthorization } from "../../firebase/withAuthorization";
import { BrowserRouter, Switch, Route, withRouter, RouteComponentProps, Redirect } from "react-router-dom";
import DashboardCompany from "./DashboardCompany";
import { DASHBOARD } from "../../constants/routes";

class DashboardComponent extends React.Component {
  constructor(props: any) {
    super(props);

    this.state = {
      users: null
    };
  }

  public componentDidMount() {
  }

  private async getCompanyList(): Promise<Array<{id:number,name:string}>> {
    //TODO: replace temporary return with actual GET request to API
    return [
      
    ];
  }

  public render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact={false} path={DASHBOARD+'/:id'} component={DashboardCompany} />
          <Route exact={true} path={DASHBOARD} component={withRouter((props: RouteComponentProps) => {
            console.log(props.location.search);
            return (
              <div>DASHBOARD</div>
            )
          })} />
          <Route exact={false} path={DASHBOARD}><Redirect to={DASHBOARD} /></Route>
        </Switch>
      </BrowserRouter>
    );
  }
}

const authCondition = (authUser: any) => !!authUser;

export const Dashboard = withAuthorization(authCondition)(DashboardComponent);
