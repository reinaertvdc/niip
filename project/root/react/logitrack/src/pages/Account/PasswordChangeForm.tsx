import * as React from "react";
import { auth } from "../../firebase";
import { Redirect } from "react-router";

interface InterfaceProps {
  error?: any;
  history?: any;
  passwordOne?: string;
  passwordTwo?: string;
}

interface InterfaceState {
  error?: Error;
  passwordOne?: string;
  passwordTwo?: string;
  redir?: string;
}

export class PasswordChangeForm extends React.Component<
  InterfaceProps,
  InterfaceState
> {
  private static INITIAL_STATE = {
    error: undefined,
    passwordOne: "",
    passwordTwo: "",
    redir: undefined
  };

  private static propKey(propertyName: string, value: string): object {
    return { [propertyName]: value };
  }

  constructor(props: any) {
    super(props);
    this.state = { ...PasswordChangeForm.INITIAL_STATE };
  }

  public onSubmit = (event: any) => {
    const { passwordOne }: any = this.state;

    auth
      .doPasswordUpdate(passwordOne)
      .then((ret: {ok:boolean,error?:Error}) => {
        if (ret.ok) {
          this.setState(() => ({ ...PasswordChangeForm.INITIAL_STATE, redir:'/' }));
        }
        else if (ret.error !== undefined) {
          this.setState({error: ret.error});
        }
        else {
          this.setState({error: new Error('Password has not been changed')});
        }
      })
      .catch((error: Error) => {
        this.setState({error: error});
      });

    event.preventDefault();
  };

  public render() {
    const { passwordOne, passwordTwo, error }: any = this.state;

    const isInvalid = passwordOne !== passwordTwo || passwordOne === "";

    if (this.state.redir !== undefined) {
      return (
        <Redirect to={this.state.redir} />
      )
    }
    return (
      <form onSubmit={event => this.onSubmit(event)}>
        <input
          value={passwordOne}
          onChange={event => this.setStateWithEvent(event, "passwordOne")}
          type="password"
          placeholder="New Password"
        />
        <input
          value={passwordTwo}
          onChange={event => this.setStateWithEvent(event, "passwordTwo")}
          type="password"
          placeholder="Confirm New Password"
        />
        <button disabled={isInvalid} type="submit">
          Reset My Password
        </button>
        {error && <p>{error.message}</p>}
      </form>
    );
  }

  private setStateWithEvent(event: any, columnType: string): void {
    this.setState(
      PasswordChangeForm.propKey(columnType, (event.target as any).value)
    );
  }
}
