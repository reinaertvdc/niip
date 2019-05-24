import * as React from 'react';

import { Firebase, FirebaseContext } from './components/firebase';
import { LoginState } from './components/firebase/firebase';
// import withFireBaseAuth from 'react-with-firebase-auth';
// import { firebaseConfig } from './components/firebase/firebaseConfig';


// import { Line } from 'react-chartjs-2';

export interface IAppProps {
}

export interface IAppState {
}

export default class App extends React.Component<IAppProps, IAppState> {
  

  constructor(props: IAppProps) {
    super(props);

    this.state = {
      
    }
  }

  public render() {
    return (
      <FirebaseContext.Consumer>
        {(firebase: Firebase|null) => {
          if (firebase === null || firebase.state === LoginState.LOGGED_OUT) {
            return (
              <div>LOGIN</div>
            )
          }
          else {
            // if (firebase !== null) {
            //   firebase.loginEmailPassword('cwout.coenen@gmail.com', 'tes234');
            // }
            return (
              <div>TEST</div>
            )
          }
        }}
      </FirebaseContext.Consumer>
    );
    
    // return (null);
    // let labels = ['74','79','99','78','85','88','76','93','84','91','98','80','75','95','77','100','70','94','90','82','83','71','86','72','87','89','96','97','81','73','92','74','79','99','78','85','88','76','93','84','91','98','80','75','95','77','100','70','94','90','82','83','71','86','72','87','89','96','97','81','73','92','74','79','99','78','85','88','76','93','84','91','98','80','75','95','77','100','70','94','90','82','83','71','86','72','87','89','96','97','81','73','92','74','79','99','78','85','88','76','93','84','91','98','80','75','95','77','100','70','94','90','82','83','71','86','72','87','89'];
    // let data = [74,79,99,78,85,88,76,93,84,91,98,80,75,95,77,100,70,94,90,82,83,71,86,72,87,89,96,97,81,73,92,74,79,99,78,85,88,76,93,84,91,98,80,75,95,77,100,70,94,90,82,83,71,86,72,87,89,96,97,81,73,92,74,79,99,78,85,88,76,93,84,91,98,80,75,95,77,100,70,94,90,82,83,71,86,72,87,89,96,97,81,73,92,74,79,99,78,85,88,76,93,84,91,98,80,75,95,77,100,70,94,90,82,83,71,86,72,87,89];
    // <Line data={{labels: labels, datasets:[{data:data}]}} />
  }
}
