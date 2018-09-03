import { OBJIOItem, SERIALIZER } from 'objio';

export class ObjectBase extends OBJIOItem {
  protected name: string;
  
  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    if (name == this.name)
      return;

    this.name = name;
    this.holder.save();
    this.holder.delayedNotify();
  }

  static TYPE_ID = 'ObjectBase';
  static SERIALIZE: SERIALIZER = () => ({
    name: { type: 'string' }
  });
}
