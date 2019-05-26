import * as React from 'react';
import * as Chart from 'react-chartjs-2';

export interface NumberGraphDataPoint {
  x: number,
  y: number
}

export interface NumberGraphDataSet {
  label: string,
  points: Array<NumberGraphDataPoint>
}

export interface INumberGraphProps {
  data: NumberGraphDataSet
}

export interface INumberGraphState {
}

export default class NumberGraph extends React.Component<INumberGraphProps, INumberGraphState> {
  constructor(props: INumberGraphProps) {
    super(props);

    this.state = {
    }
  }

  public render() {
    return (
      <div>
        <Chart.Line data={{
          datasets:[
            {label:this.props.data.label,data:this.props.data.points},
          ]}} options={
            {scales: {
              xAxes: [{
                type: 'linear',
                display: true
              }]
            }}
          }></Chart.Line>
      </div>
    );
  }
}
