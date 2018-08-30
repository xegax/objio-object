import { StateObject as Base } from '../server/state-object';
import { ClientView } from './client-class';

export class StateObject extends Base {
  static getClientViews(): Array<ClientView> {
    return [];
  }
}
