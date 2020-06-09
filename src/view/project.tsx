import * as React from 'react';
import { Project, UserObjectDesc } from 'objio/project/client';
import { OBJIOItem } from 'objio';
import { OBJIOItemClassViewable } from './config';
import { PopoverLink, Position } from 'ts-react-ui/popover';
import { ListView, Item } from 'ts-react-ui/list-view2';
import { TaskManagerBase } from 'objio/common/task-manager';
import { TaskBase } from 'objio/base/task';
export { Project };

interface TaskItem extends Item {
  task: TaskBase;
}

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

  private renderTask = (item: TaskItem) => {
    const p = item.task.getProgress();
    return (
      <div className='horz-panel-1 flexrow'>
        <div style={{ width: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.value}
        </div>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <div style={{
              position: 'absolute',
              backgroundColor: 'green',
              opacity: 0.3,
              left: 0,
              top: 4,
              bottom: 4,
              width: (p * 100) + '%'
            }}
          />
          <div className='abs-fit' style={{ textAlign: 'center' }}>
            {Math.floor(p * 100) + '%'}
          </div>
        </div>
      </div>
    );
  };

  private renderTasks(tm: TaskManagerBase) {
    const tasks = [
      ...tm.getPool().getArray(),
      ...tm.getQueue().getArray()
    ].map(task => {
      return {
        value: task.getName(),
        title: task.getDesc(),
        task,
        render: this.renderTask
      } as TaskItem;
    });

    return (
      <ListView
        style={{ maxHeight: 500 }}
        width={300}
        values={tasks}
      />
    );
  }

  render() {
    let children = this.props.model.getObjects().getArray().map((obj, i) => {
      const vd = (OBJIOItem.getClass(obj) as OBJIOItemClassViewable).getViewDesc();
      const item = vd.views.filter(v => !v.viewType)[0] || vd.views[0];
      if (!item)
        return null;

      return React.cloneElement(item.view({ model: obj }), { key: i });
    }).filter(v => v);

    const tm = this.props.model.getTaskManager();
    const pools = tm.getPool().getLength();
    const queues = tm.getQueue().getLength();
    const hasTasks = pools > 0 || queues > 0;
    return (
      <div className='abs-fit flexcol'>
        <div style={{ flexGrow: 0, minHeight: 32, display: 'flex', alignItems: 'center', padding: 5 }}>
          {this.state.user && this.state.user.login}
          <div style={{ flexGrow: 1 }}/>
          {hasTasks && (
            <PopoverLink
              style={{ flexGrow: 0 }}
              text={'tasks: ' + (pools + queues)}
              position={Position.BOTTOM_RIGHT}
            >
              {this.renderTasks(tm)}
            </PopoverLink>
          )}
        </div>
        <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
          {children}
        </div>
      </div>
    );
  }
}
