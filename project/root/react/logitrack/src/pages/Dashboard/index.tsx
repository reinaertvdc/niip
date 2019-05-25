import * as React from "react";
import { withAuthorization } from "../../firebase/withAuthorization";

class DashboardComponent extends React.Component {
  constructor(props: any) {
    super(props);

    this.state = {
      users: null
    };
  }

  public componentDidMount() {
  }

  public render() {
    return (
      <div>
        <h2>Dashboard</h2>
      </div>
    );
  }
}

const authCondition = (authUser: any) => !!authUser;

export const Dashboard = withAuthorization(authCondition)(DashboardComponent);
