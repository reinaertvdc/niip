import * as React from "react";
import { withRouter } from "react-router-dom";
import { PasswordForgetLink } from "../PasswordForget";
import { SignInForm } from "./SignInForm";

const SignInComponent = ({ history }: { [key: string]: any }) => (
  <div>
    <h1>SignIn</h1>
    <SignInForm history={history} />
    <PasswordForgetLink />
  </div>
);

export const SignIn = withRouter(SignInComponent);
