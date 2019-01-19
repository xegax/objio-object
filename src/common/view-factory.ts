import { OBJIOItem, OBJIOItemClass } from 'objio';
import { ObjectBase } from '../base/object-base';

export interface ConfigProps {
  objects(): Array<ObjectBase>;
  source?: ObjectBase;
}

export type Flag = 'create-wizard';

export interface FactoryItem {
  classObj: OBJIOItemClass;
  createObject(args: Object): OBJIOItem;
  view(props: Object): JSX.Element;

  viewType?: string;
  config?(props: ConfigProps): JSX.Element;
  sources?:  Array<Array<OBJIOItemClass>>;
  flags?: Set<Flag> | Array<Flag>;
  description?: string;
}

export class ViewFactory {
  private items = Array< FactoryItem >();

  register(args: FactoryItem): void {
    if (this.items.find(item => args.classObj == item.classObj && args.viewType == item.viewType))
      throw 'this already registered';

    args = {
      ...args,
      description: args.description || args.classObj.TYPE_ID,
      flags: Array.isArray(args.flags) ? new Set(args.flags) : args.flags || new Set([])
    };

    this.items.push(args);
  }

  findAll(args: { classObj: Object }): Array<FactoryItem> {
    return this.items.filter(item => item.classObj == args.classObj);
  }

  getView(args: {classObj: Object, viewType?: string, props: Object}): JSX.Element {
    const item = this.items.find(item => {
      if (item.classObj != args.classObj)
        return false;

      if (!args.viewType)
        return true;

      return item.viewType == args.viewType;
    });

    if (!item)
      return null;

    return item.view(args.props);
  }

  getItems(): Array<FactoryItem> {
    return this.items;
  }
}
