import * as React from "react";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import * as routes from "./constants/routes";
import { firebase } from "./firebase";
import { withAuthentication } from "./firebase/withAuthentication";
import { Account } from "./pages/Account";
import { PasswordForget } from "./pages/PasswordForget";
import { SignIn } from "./pages/SignIn";
import { Navigation } from "./components/Navigation";
import { AuthUserContext } from "./firebase/AuthUserContext";
import { Dashboard } from "./pages/Dashboard";

class AppComponent extends React.Component {
  constructor(props: any) {
    super(props);

    this.state = {
      authUser: null
    };
  }

  public componentDidMount() {
    firebase.auth.onAuthStateChanged(authUser => {
      authUser
        ? this.setState(() => ({ authUser }))
        : this.setState(() => ({ authUser: null }));
    });
  }

  public render() {
    return (
      <AuthUserContext.Consumer>
          {authUser => (authUser ? <this.AppAuth /> : <this.AppNonAuth />)}
      </AuthUserContext.Consumer>
    );
  }

  private AppAuth = () => (
    <BrowserRouter>
      <div>
        <Navigation />
        <hr />
        <Switch>
          <Route exact={true} path={routes.DASHBOARD} component={Dashboard} />
          <Route exact={true} path={routes.SIGN_IN}><Redirect to={routes.DASHBOARD} /></Route>
          <Route exact={true} path={routes.ACCOUNT} component={Account} />
        </Switch>
      </div>
    </BrowserRouter>
  );

  private AppNonAuth = () => (
    <BrowserRouter>
      <Switch>
        <Route exact={true} path={routes.SIGN_IN} component={SignIn} />
        <Route exact={true} path={routes.PASSWORD_FORGET}><Navigation /><hr /><PasswordForget /></Route> />
        <Route exact={false}><Redirect to={routes.SIGN_IN} /></Route>
      </Switch>
    </BrowserRouter>
  );

}

export const App = withAuthentication(AppComponent);
