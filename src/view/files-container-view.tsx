import * as React from 'react';
import { FilesContainer, FilesContainerArgs } from '../client/files-container';
import { Database } from '../client/database';
import { ConfigBase } from './config';
import { OBJIOItem } from 'objio';
import { FitToParent } from 'ts-react-ui/fittoparent';
import { List } from 'ts-react-ui/list';
import { RenderArgs } from 'ts-react-ui/model/list';

export { FilesContainer };

export interface FilesContainerProps {
  model: FilesContainer;
}

export class FilesContainerView extends React.Component<FilesContainerProps> {
  subscriber = () => {
    this.updateModel();
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
    this.subscriber();
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  updateModel() {
    let model = this.props.model.getRender();
    model.setItemsCount(this.props.model.getFilesCount());
    model.setColumns(this.props.model.getColumns().map((col, c) => {
      return {
        name: col.name,
        render: (args: RenderArgs<Array<string>>) => {
          return (
            <div>
              {args.item[c]}
            </div>
          );
        }
      };
    }));
    this.props.model.setNextRequestDelay(0);
  }

  renderTable(): JSX.Element {
    return (
      <FitToParent wrapToFlex>
        <List border model = { this.props.model.getRender() } />
      </FitToParent>
    );
  }

  renderImage() {
    const url = this.props.model.getSelectedUrl();

    if (!url || !['.gif', '.jpg', '.jpeg', '.png'].some(e => url.endsWith(e)))
      return null;

    return (
      <div style={{
        flexGrow: 1,
        backgroundImage: `url(${this.props.model.getSelectedUrl()})`,
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat'
      }}/>
    );
  }

  renderVideo() {
    const url = this.props.model.getSelectedUrl();
    if (!url || !['.webm', '.mp4'].some(e => url.endsWith(e)))
      return null;

    return (
      <div style={{flexGrow: 1, display: 'flex'}}>
        <FitToParent wrapToFlex>
          <video
            controls
            src={url}
          />
        </FitToParent>
      </div>
    );
  }

  renderProgress() {
    const progress = this.props.model.getProgress();
    if (!progress.loading)
      return null;

    return (
      <div style={{flexGrow: 0}}>{progress.name}, {progress.progress}</div>
    );
  }

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        {this.renderProgress()}
        <div style={{display: 'flex', flexGrow: 1}}>
          {this.renderTable()}
          {this.renderImage()}
          {this.renderVideo()}
        </div>
      </div>
    );
  }
}

export interface CfgState {
  dbId: string;
  dbs: Array<Database>;
}

export class FilesContainerConfig extends ConfigBase<FilesContainerArgs, CfgState> {
  componentDidMount() {
    const dbs = this.props.objects().map(obj => {
      if (obj instanceof Database)
        return obj;

      return null;
    }).filter(obj => obj != null);

    this.config.source = dbs[0];
    this.setState({ dbs, dbId: dbs[0].holder.getID()});
  }

  render() {
    return (
      <div style={{ display: 'flex' }}>
        <table style={{ flexGrow: 1 }}>
          <tr>
            <td> database </td>
            <td>
              <select
                style={{ width: '100%' }}
                value={this.state.dbId}
                onChange={evt => {
                  const dbId = evt.currentTarget.value;
                  this.config.source = this.state.dbs.find(db => db.holder.getID() == dbId);
                  this.setState({ dbId });
                }}>
                {(this.state.dbs || []).map((db, i) => {
                  return (
                    <option
                      key={i}
                      value={db.holder.getID()}
                      title={OBJIOItem.getClass(db).TYPE_ID}
                    >
                      { db.getName() }
                    </option>
                  );
                })}
              </select>
            </td>
          </tr>
        </table>
      </div>
    );
  }
}
