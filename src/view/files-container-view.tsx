import * as React from 'react';
import { FilesContainer, FilesContainerArgs } from '../client/files-container';
import { Database } from '../client/database/database';
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

  getSelectedUrl() {
    let url = this.props.model.getSelectedUrl();
    let remote = this.props.model.getRemoteSelect();
    if (this.watch && remote && remote.length) {
      return this.props.model.getPath(remote[0].url);
    }

    return url;
  }

  renderImage() {
    const url = this.getSelectedUrl();

    if (!url || !['.gif', '.jpg', '.jpeg', '.png'].some(e => url.endsWith(e)))
      return null;

    return (
      <div style={{
        flexGrow: 1,
        backgroundImage: `url(${url})`,
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat'
      }}/>
    );
  }

  watch = false;
  autoplay = false;
  audio = React.createRef<HTMLAudioElement>();

  toggleWatch = () => {
    this.watch = !this.watch;
    if (this.watch)
      this.subscriber();
    else
      this.setState({});
  }

  renderMusic() {
    const url = this.getSelectedUrl();

    if (!url || !['.mp3'].some(e => url.endsWith(e)))
      return null;

    return (
      <div style={{flexGrow: 1}}>
        <audio ref={this.audio} src={url} autoPlay={this.autoplay || this.watch} controls
          onClick={() => {
            setTimeout(() => {
              if (!this.audio.current)
                return;

              this.autoplay = !this.audio.current.paused;
            }, 100);
          }}

          onEnded={() => {
            if (!this.watch)
              this.props.model.selectNextFile('.mp3');
          }}
        />
      </div>
    );
  }

  renderVideo() {
    const url = this.getSelectedUrl();
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
    const progress = this.props.model.getUserProgress();
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
        <div style={{flexGrow: 0}}>
          <input type='checkbox' id='watch' checked={this.watch} onClick={this.toggleWatch}/>
          <label htmlFor='watch' onClick={this.toggleWatch}>watch</label>
        </div>
        <div style={{display: 'flex', flexGrow: 1}}>
          {this.renderTable()}
          {this.renderImage()}
          {this.renderVideo()}
          {this.renderMusic()}
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
    const dbs = this.props.objects([ Database ]) as Array<Database>;

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
