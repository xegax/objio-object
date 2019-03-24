import * as React from 'react';
import { Project, UserObjectDesc } from 'objio/project/client';
import { OBJIOItem } from 'objio';
import { OBJIOItemClassViewable } from './config';

export { Project };

export interface Props {
  model: Project;
}

export interface State {
  user: UserObjectDesc;
}

export class ProjectView extends React.Component<Props, Partial<State>> {
  state: Readonly<Partial<State>> = {};

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.getCurrUserDesc()
    .then(user => {
      this.setState({user});
    });

    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  render() {
    let children = this.props.model.getObjects().getArray().map((obj, i) => {
      const vd = (OBJIOItem.getClass(obj) as OBJIOItemClassViewable).getViewDesc();
      const item = vd.views.filter(v => !v.viewType)[0] || vd.views[0];
      if (!item)
        return null;

      return React.cloneElement(item.view({ model: obj }), { key: i });
    }).filter(v => v);

    return (
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex'}}>
        <div style={{position: 'relative', display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
          <div style={{ flexGrow: 0, minHeight: 32 }}>
            { this.state.user && this.state.user.login }
          </div>
          <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
            {children}
          </div>
        </div>
      </div>
    );
  }
}
