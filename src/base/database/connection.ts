import { ObjectBase } from '../object-base';
import { SERIALIZER } from 'objio';

export abstract class ConnectionBase extends ObjectBase {
  protected host: string;
  protected port: number;
  protected user: string;
  protected connected: boolean = false;

  abstract setPassword(args: { password: string }): Promise<boolean>;
  abstract reconnect(): Promise<boolean>;

  getHost(): string {
    return this.host;
  }

  setHost(host: string) {
    if (this.host == host)
      return;

    this.host = host;
    this.holder.save();
  }

  getPort(): number {
    return this.port;
  }

  setPort(port: number) {
    port = Math.floor(+port);
    if (port == null || Number.isNaN(port) || !Number.isFinite(port))
      return;

    if (this.port == port)
      return;

    this.port = port;
    this.holder.save();
  }

  getUser(): string {
    return this.user;
  }

  setUser(user: string) {
    if (this.user == user)
      return;

    this.user = user;
    this.holder.save();
  }

  isConnected() {
    return this.connected;
  }

  toString(): string {
    return `${this.user}@${this.host}:${this.port}`;
  }

  static TYPE_ID = 'Connection';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    host: { type: 'string' },
    port: { type: 'integer' },
    user: { type: 'string' },
    connected: { type: 'integer', const: true }
  })
}
