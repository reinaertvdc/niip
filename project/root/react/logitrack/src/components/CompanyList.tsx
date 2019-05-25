import * as React from 'react';
import { Link } from 'react-router-dom';
import { DASHBOARD } from '../constants/routes';

export interface Company {
  id:number,
  name:string
}

export interface ICompanyListProps {
  companies: Array<Company>
}

export interface ICompanyListState {
}

export default class CompanyList extends React.Component<ICompanyListProps, ICompanyListState> {
  constructor(props: ICompanyListProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <ul>
        {this.props.companies.map((item,index) => (
          <li key={item.id}><Link to={DASHBOARD+'/'+item.id}>{item.name}</Link></li>
        ))}
      </ul>
    );
  }
}
