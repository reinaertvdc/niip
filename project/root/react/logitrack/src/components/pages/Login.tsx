import * as React from 'react';


export interface ILoginProps {
  onLogin: (loggedIn: boolean, type: 'admin'|'company'|'node') => void
}

export interface ILoginState {
  type: 'admin'|'company'|'node',
  id: string,
  password: string
}

export default class Login extends React.Component<ILoginProps, ILoginState> {
  constructor(props: ILoginProps) {
    super(props);

    this.state = {
      type: 'admin',
      id: '',
      password: ''
    }
  }

  private onChangeType = (e: React.FormEvent<HTMLSelectElement>) => {
    let val = e.currentTarget.value;
    if (typeof val === 'string' && (val === 'admin' || val === 'company' || val === 'node')) {
      this.setState({
        type: val
      })
    }
  }

  private onChangeId = (e: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      id: e.currentTarget.value
    });
  }

  private onChangePassword = (e: React.FormEvent<HTMLInputElement>) => {
    this.setState({
      password: e.currentTarget.value
    });
  }

  private onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    //TODO: check login details with server (request session etc)
    this.props.onLogin(true, this.state.type);
    e.preventDefault();
  }

  public render() {
    return (
      <div>
        <form onSubmit={this.onSubmit}>
          type: <select id="type" value={this.state.type} onChange={this.onChangeType}>
            <option value="admin">admin</option>
            <option value="company">company</option>
            <option value="node">node</option>
          </select><br />
          id: <input id="id" type="text" placeholder="id" value={this.state.id} onChange={this.onChangeId} /><br />
          password: <input id="password" type="password" placeholder="password" value={this.state.password} onChange={this.onChangePassword} /><br />
          <input type="submit" value="Login" />
        </form>
      </div>
    );
  }
}
