import * as React from 'react';
import { Connection } from '../client/database/connection';
import { Card, Elevation } from 'ts-react-ui/blueprint';

export { Connection };

export interface Props {
  model: Connection;
}

export class ConnectionView extends React.Component<Props> {
  render() {
    const m = this.props.model;
    return (
      <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Card interactive={false} elevation={Elevation.TWO}>
          <h5>Database connection</h5>
          <p>Host: <strong>{m.getHost()}</strong></p>
          <p>Port: <strong>{m.getPort()}</strong></p>
          <p>User: <strong>{m.getUser()}</strong></p>
          <p>{m.isConnected() ? 'Connection established' : 'Disconnected'}</p>
        </Card>
      </div>
    );
  }
}

