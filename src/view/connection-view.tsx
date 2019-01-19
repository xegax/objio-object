import * as React from 'react';
import { Connection, ConnectionArgs } from '../client/database/connection';
import { ConfigBase } from './config';
import { TextPropItem, PropsGroup } from 'ts-react-ui/prop-sheet';

export { Connection };

export interface Props {
  model: Connection;
}

export class ConnectionView extends React.Component<Props> {
  render() {
    return (
      this.props.model.toString()
    );
  }
}

export class ConnectionConfig extends ConfigBase<ConnectionArgs> {
  componentDidMount() {
    this.config.host = 'localhost';
    this.config.port = 3306;
    this.config.user = 'root';
    this.setState({});
  }

  render() {
    return (
      <PropsGroup label='connection'>
        <TextPropItem
          label='host'
          value={this.config.host}
          onChanged={value => {
            this.config.host = value;
          }}
        />
        <TextPropItem
          label='user'
          value={this.config.user}
          onChanged={value => {
            this.config.user = value;
          }}
        />
        <TextPropItem
          label='port'
          value={this.config.port}
          onChanged={value => {
            this.config.port = +value;
          }}
        />
        <TextPropItem
          label='password'
          onEnter={value => {
            this.config.password = value;
            return '';
          }}
        />
      </PropsGroup>
    );
  }
}
