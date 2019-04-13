import * as React from 'react';
import { ConnectionBase } from '../../base/database/connection';
import { SERIALIZER } from 'objio';
import { PropsGroup, PropItem, TextPropItem } from 'ts-react-ui/prop-sheet';

export interface ConnectionArgs {
  host: string;
  port: number;
  user: string;
  password: string;
}

export class Connection extends ConnectionBase {
  setPassword(args: { password: string }): Promise<boolean> {
    if (!args.password)
      return Promise.reject('empty password');

    return this.holder.invokeMethod({
      method: 'setPassword',
      args: { password: (args.password || '').trim() }
    });
  }

  reconnect(): Promise<boolean> {
    return this.holder.invokeMethod({ method: 'reconnect', args: {} });
  }

  getObjPropGroups() {
    return (
      <PropsGroup label='connection'>
        <TextPropItem
          label='host'
          value={this.host}
          onEnter={host => {
            this.setHost(host);
          }}
        />
        <TextPropItem
          label='port'
          value={this.port}
          onEnter={port => {
            this.setPort(+port);
          }}
        />
        <TextPropItem
          label='user'
          value={this.user}
          onEnter={user => {
            this.setUser(user);
          }}
        />
        <TextPropItem
          label='password'
          onEnter={password => {
            this.setPassword({ password });
            return '';
          }}
        />
        <PropItem
          label='connection'
          value={this.isConnected() ? 'on' : 'off'}
        />
        <PropItem>
          <button onClick={() => this.reconnect()}>
            reconnect
          </button>
        </PropItem>
      </PropsGroup>
    );
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...ConnectionBase.SERIALIZE()
  })
}
