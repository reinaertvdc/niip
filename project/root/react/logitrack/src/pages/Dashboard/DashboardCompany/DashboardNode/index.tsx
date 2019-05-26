import * as React from 'react';
import { Redirect } from 'react-router';
import { DASHBOARD } from '../../../../constants/routes';
import NumberGraph, {NumberGraphDataSet} from '../../../../components/NumberGraph';

export interface IDashboardNodeProps {
  match: {
    params: {
      company: string,
      id: string
    }
  }
}

export interface IDashboardNodeState {
  tmpData: NumberGraphDataSet
}

const initialNumberGraphDataSet: NumberGraphDataSet = {label:'',points:[]}

export default class DashboardNode extends React.Component<IDashboardNodeProps, IDashboardNodeState> {
  constructor(props: IDashboardNodeProps) {
    super(props);

    this.state = {
      tmpData: initialNumberGraphDataSet
    }
  }

  private async getNodeData(): Promise<void> {
    //TODO: get node data from API
    this.setState({
      tmpData: {
        label:'speed',
        points:[{x:1,y:1},{x:5,y:2},{x:6,y:3},{x:7,y:2}]
      }
    })
  }

  public componentDidMount() {
    //TODO: remove timeout
    setTimeout(() => {
      this.getNodeData();
    }, 1000);
  }

  public render() {
    let company = parseInt(this.props.match.params.company);
    if (isNaN(company)) {
      return <Redirect to={DASHBOARD} />
    }
    let id = parseInt(this.props.match.params.id);
    if (isNaN(id)) {
      return <Redirect to={DASHBOARD+'/'+company} />
    }
    return (
      <div>
        <NumberGraph data={this.state.tmpData} />
      </div>
    );
  }
}
