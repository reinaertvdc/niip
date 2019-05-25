import * as React from "react";
import { withRouter, RouteComponentProps } from "react-router-dom";
import { PasswordForgetLink } from "../PasswordForget";
import { SignInForm } from "./SignInForm";

const SignInComponent = (props: RouteComponentProps<{['redir']?: string, ['history']?: any}>) => {
  if ('redir' in props && props['redir'] !== null && props['redir'] !== undefined) {
    return (
      <div>
        <h1>SignIn</h1>
        <SignInForm history={props['history']} redir={props['redir']} />
        <PasswordForgetLink />
      </div>
    )
  }
  else {
    return (
      <div>
        <h1>SignIn</h1>
        <SignInForm history={props.history} />
        <PasswordForgetLink />
      </div>
    )
  }
};

export const SignIn = withRouter(SignInComponent);
