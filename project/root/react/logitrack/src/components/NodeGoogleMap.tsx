import * as React from 'react';
import GoogleMapReact from 'google-map-react';
import { getCenter, getDistance } from 'geolib';

export interface NodeLocation {
  id: number,
  lbl: string,
  lat: number,
  lng: number
}

export interface INodeGoogleMapProps {
  locations: Array<NodeLocation>
}

export interface INodeGoogleMapState {
}

export default class NodeGoogleMap extends React.Component<INodeGoogleMapProps, INodeGoogleMapState> {
  constructor(props: INodeGoogleMapProps) {
    super(props);

    this.state = {
    }
  }

  private Marker = ({lbl, lat, lng}:{lbl:string, lat:number, lng: number}) => (
    <div style={{
      color: 'white',
      background: 'grey',
      padding: '15px 10px',
      display: 'inline-flex',
      textAlign: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '100%',
      transform: 'translate(-50%,-50%)'
    }}>{lbl}</div>
  )

  private distanceToZoom(d: number): number {
    let m: number = 1000;
    let f: number = 15;
    while (f > 1) {
      if (d < m) {
        return f;
      }
      m *= 2;
      f--;
    }
    return 1;
  }

  private getCenterAndZoom(): {center:{lat:number,lng:number},zoom:number} {
    if (this.props.locations.length === 0) {
      return {center:{lat:50,lng:50},zoom:1};
    }
    if (this.props.locations.length === 1) {
      let loc = this.props.locations[0];
      return {center:{lat:loc.lat,lng:loc.lng},zoom:12};
    }
    let coords: Array<{latitude:number,longitude:number}> = [];
    for (let i: number = 0; i < this.props.locations.length; i++) {
      let loc = this.props.locations[i];
      coords.push({latitude:loc.lat,longitude:loc.lng});
    }
    let center = getCenter(coords);
    if (!center) {
      return {center:{lat:50,lng:50},zoom:1};
    }
    let dmax: number = 0;
    for (let i: number = 0; i < coords.length; i++) {
      let c = coords[i];
      let d = getDistance(center,c);
      if (d > dmax) {
        dmax = d;
      }
    }
    let zoom = this.distanceToZoom(dmax);
    return {center:{lat:center.latitude, lng:center.longitude},zoom:zoom};
  }

  public render() {
    let cz = this.getCenterAndZoom();
    return (
      <div style={{height: '100vh', width: '100%'}}>
        <GoogleMapReact
          yesIWantToUseGoogleMapApiInternals={true}
          bootstrapURLKeys={{key:'AIzaSyD5GO-gldm2Mi0Z-4I-htyjNblhouWJvz4'}}
          defaultCenter={{lat:45,lng:0}}
          defaultZoom={1}
          center={cz.center}
          zoom={cz.zoom}>
          {this.props.locations.map((value: NodeLocation, index: number) => (
            <this.Marker key={value.id} lbl={value.lbl} lat={value.lat} lng={value.lng} />
          ))}
        </GoogleMapReact>
      </div>
    );
  }
}
