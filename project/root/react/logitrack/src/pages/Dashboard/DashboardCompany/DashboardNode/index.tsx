import * as React from 'react';
import { Redirect } from 'react-router';
import { DASHBOARD } from '../../../../constants/routes';
import NumberGraph, {NumberGraphDataSet} from '../../../../components/NumberGraph';
import NodeGoogleMap, { NodeLocation } from '../../../../components/NodeGoogleMap';

export interface IDashboardNodeProps {
  match: {
    params: {
      company: string,
      id: string
    }
  }
}

export interface IDashboardNodeState {
  tmpData: NumberGraphDataSet,
  location: NodeLocation|undefined
}

const initialNumberGraphDataSet: NumberGraphDataSet = {label:'',points:[]}

export default class DashboardNode extends React.Component<IDashboardNodeProps, IDashboardNodeState> {
  constructor(props: IDashboardNodeProps) {
    super(props);

    this.state = {
      tmpData: initialNumberGraphDataSet,
      location: undefined
    }
  }

  private async getNodeData(): Promise<void> {
    //TODO: remove timeout
    //TODO: get node data from API
    setTimeout(() => {
      this.setState({
        tmpData: {
          label:'speed',
          points:[{x:1,y:1},{x:5,y:2},{x:6,y:3},{x:7,y:2}]
        }
      })
    }, 1000);
  }

  private async getNodeLocation(): Promise<void> {
    //TODO: remove timeout
    //TODO: get node data from API
    setTimeout(() => {
      this.setState({
        location: {
          lbl:'truck ' + this.props.match.params.id,
          id: parseInt(this.props.match.params.id),
          lat:50.9312154+(Math.random()/10)-0.05, lng:5.3935026+(Math.random()/10)-0.05
        }
      });
    }, 2000);
    setTimeout(this.getNodeLocation.bind(this), 15000);
  }

  public componentDidMount() {
    //TODO: remove timeout
    this.getNodeData();
    this.getNodeLocation();
  }

  private Location = () => {
    if (this.state.location !== undefined) {
      return (
        <NodeGoogleMap locations={[this.state.location]} />
      )
    }
    return (null);
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
        <this.Location />
      </div>
    );
  }
}
