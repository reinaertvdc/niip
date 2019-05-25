import * as React from "react";

class HomeComponent extends React.Component {
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
        <h2>Home Page</h2>
      </div>
    );
  }
}

export const Home = HomeComponent;
