import * as React from 'react';
import { ServerInstance } from 'objio/project/client/server-instance';
import { UserObject, SessionStat } from 'objio/project/client/user-object';
import { PropSheet, PropsGroup, PropItem, TextPropItem } from 'ts-react-ui/prop-sheet';
import { Tabs, Tab } from 'ts-react-ui/tabs';
import { ListView, Item } from 'ts-react-ui/list-view';
import { AppCompLayout, AppComponent, AppContent } from 'ts-react-ui/app-comp-layout';
import { CheckIcon } from 'ts-react-ui/checkicon';
import { RequestStat } from 'objio/base/statistics';

export interface Props {
  model: ServerInstance;
}

export { ServerInstance };

export interface UserItem extends Item {
  obj: UserObject;
}

export interface State {
  user: UserObject;
  sessStat: SessionStat;
  totalStat: SessionStat;
  login: string;
  email: string;
}

function isoDateTime(time: number) {
  if (!time)
    return '';

  return new Date(time).toISOString().split('T').join(' ');
}

const msPerMin = 60 * 1000;
const msPerHour = msPerMin * 60;
const msPerDay = msPerHour * 24;
const msPerWeek = msPerDay * 7;

function formatTimeLen(time: number) {
  if (!time)
    return '';

  const min = Math.floor(time / msPerMin);
  const hours = Math.floor(time / msPerHour);
  const days = Math.floor(time / msPerDay);
  const weeks = Math.floor(time / msPerWeek);

  if (weeks > 0) {
    return `${weeks} weeks ` + formatTimeLen(time - weeks * msPerWeek);
  } else if (days > 0) {
    return `${days} days ` + formatTimeLen(time - days * msPerDay);
  } else if (hours > 0) {
    return `${hours} hours ` + formatTimeLen(time - hours * msPerHour);
  } else if (min > 0) {
    return `${min} mins ` + formatTimeLen(time - min * msPerMin);
  }

  return '';
}

const bPerKB = 1024;
const bPerMB = bPerKB * 1024;
const bPerGB = bPerMB * 1024;

function formatBytes(size: number) {
  if (size == null)
    return '';

  const kb = size / bPerKB;
  const mb = size / bPerMB;
  const gb = size / bPerGB;

  if (Math.floor(gb) > 0) {
    return `${Math.round(gb * 100) / 100} GB`;
  } else if (Math.floor(mb) > 0) {
    return `${Math.round(mb * 100) / 100} MB`;
  } else if (Math.floor(kb) > 0) {
    return `${Math.round(kb * 100) / 100} KB`;
  }

  return size + ' bytes';
}

export class ServerInstanceView extends React.Component<Props, Partial<State>> {
  state: Readonly<Partial<State>> = {
    login: '',
    email: ''
  };

  input = React.createRef<HTMLInputElement>();

  userWatch = {
    onObjChange: () => this.requestUserStat()
  };

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  requestUserStat() {
    const user = this.state.user;
    if (!user)
      return;

    Promise.all([user.getLastSessionStat(), user.getTotalStat()])
      .then(arr => {
        this.setState({ sessStat: arr[0], totalStat: arr[1] });
      });
  }

  onSelectUser = (item: UserItem) => {
    if (item.obj == this.state.user)
      return;

    this.state.user && this.state.user.holder.removeEventHandler(this.userWatch);
    this.setState({ user: item.obj, sessStat: null, totalStat: null }, () => this.requestUserStat());
    item.obj.holder.addEventHandler(this.userWatch);
  }

  renderStat(stat: SessionStat, label: string, total: boolean) {
    if (!stat)
      return <PropsGroup label={label} />;

    return (
      <PropsGroup label={label}>
        {!total && <PropItem label='start time' value={isoDateTime(stat.startTime)} />}
        {total && <PropItem label='time' value={stat.time} />}
        {total && <PropItem label='total sessions' value={stat.sessionsNum} />}
        <PropItem label='time' value={stat.time} />
        <PropItem label='requests' value={stat.requestsNum} />
        <PropItem label='reads' value={stat.readsNum} />
        <PropItem label='writes' value={stat.writesNum} />
        <PropItem label='creates' value={stat.createsNum} />
        <PropItem label='invokes' value={stat.invokesNum} />
      </PropsGroup>
    );
  }

  renderUserItem(user: UserObject): JSX.Element {
    return (
      <div className='horz-panel-1 flex' key={user.holder.getVersion()}>
        <CheckIcon
          faIcon='fa fa-plug'
          value={user.isOnline()}
          title='disconnect'
          onChange={() => {
            this.props.model.kickUser({ id: user.holder.getID() });
          }} />
        <div style={{ display: 'flex', flexGrow: 1 }}>{user.getLogin()}</div>
        <CheckIcon
          showOnHover
          faIcon='fa fa-remove'
          title='remove'
          value
          onChange={() => {
            this.props.model.removeUser({ id: user.holder.getID() });
          }} />
      </div>
    );
  }

  renderServerStat(stat: RequestStat, total: boolean) {
    let time: JSX.Element;
    if (total) {
      time = <PropItem label='work time' value={formatTimeLen(stat.time)} />;
    } else {
      time = (
        <PropItem
          label='life time'
          value={formatTimeLen(Date.now() - stat.time)}
        />
      );
    }

    return (
      <>
        {time}
        <PropItem label='files received' value={stat.getFilesNum} />
        <PropItem label='received' value={formatBytes(stat.recvBytes)} />
        <PropItem label='sent' value={formatBytes(stat.sentBytes)} />
        <PropItem label='create' value={stat.createNum} />
        <PropItem label='write' value={stat.writeNum} />
        <PropItem label='read' value={stat.readNum} />
        <PropItem label='invoke' value={stat.invokeNum} />
        <PropItem label='requests' value={stat.requestNum} />
        {total ? <PropItem label='start count' value={stat.startCount} /> : null}
      </>
    );
  }

  renderServerStatTabs() {
    const sessStat = this.props.model.getSessStat();
    const totalStat = this.props.model.getTotalStat();
    return (
      <PropsGroup label='server'>
        <Tabs defaultSelect='session'>
          <Tab label='session' id='session'>
            {this.renderServerStat(sessStat, false)}
          </Tab>
          <Tab label='total' id='total'>
            {this.renderServerStat(totalStat, true)}
          </Tab>
        </Tabs>
      </PropsGroup>
    );
  }

  renderEditUser(user: UserObject) {
    if (user) {
      return (
        <>
          <TextPropItem
            label='login'
            value={user.getLogin()}
            onEnter={login => {
              user.modify({ login });
            }}
          />
          <TextPropItem
            label='name'
            value={user.getName()}
            onEnter={name => {
              user.modify({ name });
            }}
          />
          <TextPropItem
            label='email'
            value={user.getEmail()}
            onEnter={email => {
              user.modify({ email });
            }}
          />
          <TextPropItem
            label='password'
            onEnter={pwd => {
              user.modify({ password: pwd });
              return '';  // clear text field
            }}
          />
        </>
      );
    }

    return null;
  }

  renderUsers() {
    let users = this.props.model.getUsers();
    return (
      <PropSheet>
        <PropsGroup label='users'>
          <ListView
            style={{ maxHeight: 300 }}
            onSelect={this.onSelectUser}
            values={users.map((user: UserObject) => {
              return {
                value: user.holder.getID(),
                title: user.getLogin(),
                render: () => this.renderUserItem(user),
                obj: user
              };
            })}
          />
          <Tabs defaultSelect='edit'>
            <Tab id='edit' label='edit'>
              {this.renderEditUser(this.state.user)}
            </Tab>
            <Tab id='stat' label='stat'>
              {this.renderStat(this.state.sessStat, 'session stat', false)}
              {this.renderStat(this.state.totalStat, 'total stat', true)}
            </Tab>
            <Tab id='new' label='new user'>
              <TextPropItem
                label='login'
                value={this.state.login}
                onEnter={login => this.setState({ login })}
              />
              <TextPropItem
                label='email'
                value={this.state.email}
                onEnter={email => this.setState({ email })}
              />
              <PropItem>
                <button onClick={() => {
                  this.props.model.addUser({ login: this.state.login, email: this.state.email });
                }}>create</button>
              </PropItem>
            </Tab>
          </Tabs>
        </PropsGroup>
        {this.renderServerStatTabs()}
      </PropSheet>
    );
  }

  renderSelectUser() {
    if (!this.state.user)
      return <div style={{ color: 'gray' }}>select user</div>;

    return (
      <>
        <div>{this.state.user.getLogin()}</div>
      </>
    );
  }

  render() {
    return (
      <AppCompLayout defaultSelect='users'>
        <AppComponent id='users' faIcon='fa fa-users'>
          {this.renderUsers()}
        </AppComponent>
        <AppContent>
          nothing selected
        </AppContent>
        <AppContent id='users'>
          {this.renderSelectUser()}
        </AppContent>
      </AppCompLayout>
    );
  }
}
