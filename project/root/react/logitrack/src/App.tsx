import * as React from "react";
import { BrowserRouter, Route, Switch, Redirect, withRouter, RouteComponentProps } from "react-router-dom";
import * as routes from "./constants/routes";
import { firebase } from "./firebase";
import { withAuthentication } from "./firebase/withAuthentication";
import { Account } from "./pages/Account";
import { PasswordForget } from "./pages/PasswordForget";
import { SignIn } from "./pages/SignIn";
import { Navigation } from "./components/Navigation";
import { AuthUserContext } from "./firebase/AuthUserContext";
import { Dashboard } from "./pages/Dashboard";
import { User } from "firebase";
import * as QueryString from 'query-string'


class AppComponent extends React.Component<{},{authUser:User|null,redir:string|null}> {
  constructor(props: any) {
    super(props);

    this.state = {
      authUser: null,
      redir: null
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
          {authUser => (authUser ? <this.App authed={true} /> : <this.App authed={false} />)}
      </AuthUserContext.Consumer>
    );
  }

  private App = (props: {authed:boolean}) => (
    //TODO: put everything in a route
    <BrowserRouter>
      <Route exact={false} path="/" component={withRouter((routeProps: RouteComponentProps)=>{
        let path = routeProps.location.pathname;
        let redr: string|null = this.state.redir;
        if (routeProps.location.search !== null) {
          let queryParams = QueryString.parse(routeProps.location.search);
          if (typeof queryParams.redir === 'string' && queryParams.redir.length > 0) {
            redr = queryParams.redir;
          }
        }
        if (redr === null && path !== routes.DASHBOARD) {
          redr = path;
        }
        if (redr !== null) {
          if (this.state.redir !== redr) {
            this.setState({redir:redr});
          }
        }
        if (props.authed) return this.AppAuth();
        else return this.AppNonAuth()
      })}/>
      
    </BrowserRouter>
  )

  private AppAuth = () => {
    console.log('AUTH');
    console.log(this.state);
    return (
      <BrowserRouter>
        <div>
          <Navigation />
          <hr />
          <Switch>
            <Route exact={true} path={routes.SIGN_IN}><Redirect to={this.state.redir !== null ? this.state.redir : routes.DASHBOARD} /></Route>
            <Route exact={true} path={routes.ACCOUNT} component={Account} />
            <Route exact={false} path={routes.DASHBOARD} component={Dashboard} />
          </Switch>
        </div>
      </BrowserRouter>
    )
  };

  private AppNonAuth = () => {
    console.log('NONAUTH');
    console.log(this.state);
    return (
      <BrowserRouter>
        <Switch>
          <Route exact={true} path={routes.SIGN_IN} render={(props:RouteComponentProps)=>(<SignIn {...props} {...{redir:this.state.redir}} />)} />
          <Route exact={true} path={routes.PASSWORD_FORGET}><Navigation /><hr /><PasswordForget /></Route> />
          <Route exact={false} path={routes.DASHBOARD} component={withRouter((props: RouteComponentProps) => {
            if (this.state.redir !== null) {
              console.log('REDIR TEST 1');
              return <Redirect to={routes.SIGN_IN+'?redir='+encodeURIComponent(this.state.redir)} />;
            }
            else {
              return (null);
            }
          })} />
        </Switch>
      </BrowserRouter>
    )
  };

}

export const App = withAuthentication(AppComponent);
