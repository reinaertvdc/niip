import * as React from 'react';
import { Link } from 'react-router-dom';
import { DASHBOARD } from '../constants/routes';

export interface TruckNode {
  company: number,
  id: number
}

export interface INodeListProps {
  nodes: Array<TruckNode>
}

export interface INodeListState {
}

export default class NodeList extends React.Component<INodeListProps, INodeListState> {
  constructor(props: INodeListProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <ul>
        {this.props.nodes.map((item,index) => (
          <li key={item.id}><Link to={DASHBOARD+'/'+item.company+'/'+item.id}>Node {item.id}</Link></li>
        ))}
      </ul>
    );
  }
}
