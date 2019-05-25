import * as React from "react";
import { Link } from "react-router-dom";
import { PasswordForgetForm } from "./PasswordForgetForm";
import { PASSWORD_FORGET } from "../../constants/routes";

export const PasswordForget = () => (
  <div>
    <h1>PasswordForget</h1>
    <PasswordForgetForm />
  </div>
);

export const PasswordForgetLink = () => (
  <p>
    <Link to={PASSWORD_FORGET}>Forgot Password?</Link>
  </p>
);
