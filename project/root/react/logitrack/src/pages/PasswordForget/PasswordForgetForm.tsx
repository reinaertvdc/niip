import * as React from "react";
import { auth } from "../../firebase";
import { Redirect } from "react-router";
import { DASHBOARD } from "../../constants/routes";

export class PasswordForgetForm extends React.Component<{}, {email: string, error: Error|null, done: boolean}> {
  private static INITIAL_STATE = {
    email: "",
    error: null,
    done: false
  };

  constructor(props: any) {
    super(props);

    this.state = PasswordForgetForm.INITIAL_STATE;
  }

  public onSubmit = (event: any) => {
    const { email }: any = this.state;

    auth
      .doPasswordReset(email)
      .then(() => {
        this.setState({...PasswordForgetForm.INITIAL_STATE, done: true});
      })
      .catch((error: Error) => {
        this.setState({...PasswordForgetForm.INITIAL_STATE, error: error});
      });

    event.preventDefault();
  };

  public render() {
    const { email, error, done }: {email:string, error:Error|null, done: boolean} = this.state;
    const isInvalid = email === "";

    if (done) {
      return <Redirect to={DASHBOARD} />
    }
    else {
      return (
        <form onSubmit={(event) => this.onSubmit(event)}>
          <input
            value={email}
            onChange={(event) => this.setStateEmailWithEvent(event)}
            type="text"
            placeholder="Email Address"
          />
          <button disabled={isInvalid} type="submit">
            Reset My Password
          </button>

          {error && <p>{error.message}</p>}
        </form>
      );
    }
  }

  private setStateEmailWithEvent(event: React.FormEvent<HTMLInputElement>): void {
    this.setState({
      email: (event.target as any).value
    });
  }
}
