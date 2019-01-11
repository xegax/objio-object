import * as React from 'react';
import {
  SpriteSheet,
  Animation,
  FrameInfo,
  DocSpriteSheetArgs
} from '../client/sprite-sheet';
import { Rect, CSSRect, cssRectToRect, Point, rectToCSSRect } from '../common/point';
import { startDragging } from 'ts-react-ui/common/start-dragging';
import { isLeftDown } from 'ts-react-ui/common/event-helpers'
import { className as cn } from 'ts-react-ui/common/common';
import { Menu, ContextMenu, MenuItem, Tab, Tabs } from 'ts-react-ui/blueprint';
import { ConfigBase } from './config';
import { FileObjectBase } from '../base/file-object';

export {
  SpriteSheet,
  Animation
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(v, max));
}

const classes = {
  root: 'sprite-sheet-view',
  rect: 'rect',
  rectSelect: 'rect-select',
  corner: 'corner',
  ltCorner: 'lt-corner',
  rtCorner: 'rt-corner',
  rbCorner: 'rb-corner',
  lbCorner: 'lb-corner'
};

export interface Props {
  model: SpriteSheet;
}

function getPointOn(event: React.MouseEvent<any>, relateOn?: HTMLElement) {
  relateOn = relateOn || event.currentTarget as HTMLElement;
  const bbox = relateOn.getBoundingClientRect();
  return {
    x: event.clientX - bbox.left + relateOn.scrollLeft,
    y: event.clientY - bbox.top + relateOn.scrollTop
  };
}

function getFrameStyle(rect: Rect, model: SpriteSheet, ofs?: Point) {
  ofs = ofs || {x: 0, y: 0};
  return {
    position: 'relative',
    border: '1px solid black',
    backgroundImage: `url(${model.getImageUrl()})`,
    backgroundPosition: `${-(rect.x + ofs.x)}px ${-(rect.y + ofs.y)}px`,
    width: rect.width,
    height: rect.height,
    display: 'inline-block'
  } as any;
}

class Preview extends React.Component<{anim: Animation, model: SpriteSheet}, {time: number}> {
  private mount: boolean = false;

  timer = () => {
    if (!this.mount)
      return;

    if (this.props.model.isPlaying()) {
      this.props.model.setPlayFrame(this.props.model.getPlayFrame() + 1);
    }

    setTimeout(this.timer, this.props.model.getPlayInterval());
  }

  componentDidMount() {
    this.mount = true;
    this.timer();
  }

  componentWillUnmount() {
    this.mount = false;
  }

  onAddSpeed(addTime: number) {
    const time = clamp(this.state.time + addTime, 50, 300);
    this.setState({time});
  }

  render() {
    const { model } = this.props;
    const selectAnim = model.getSelectAnim();
    if (!selectAnim)
      return null;

    const playFrame = model.getPlayFrame();
    const frame = selectAnim.frames[playFrame];
    if (!frame)
      return null;

    const rectIdx = frame.rect;
    const rects = model.getRects();
    const rect = rects[rectIdx];
    if (!rect)
      return null;

    // const {baseX, baseY} = frame;
    const size = selectAnim.getSize(rects);
    size.width += 10;
    size.height += 10;

    const origin = { x: size.width / 2, y: size.height - 5 };
    let paddingLeft = origin.x - frame.baseX || 0;
    let paddingTop = origin.y - frame.baseY || 0;

    return (
      <div style={{position: 'relative'}}>
        <div
          tabIndex={0}
          style={{
            paddingLeft,
            paddingTop,
            height: size.height,
            display: 'inline-block',
            overflowY: 'hidden'
          }}
          onKeyDown={e => {
            /*if (e.keyCode == 37) {
              this.onNextFrame(-1);
            } else if (e.keyCode == 39) {
              this.onNextFrame(1);
            }*/
          }}
        >
          <div
            style={{...getFrameStyle(rect, model), border: 'none'}}
          />
        </div>
      </div>
    );
  }
}

export type Mode = 'add-anim';
export interface State {
  newRect?: Rect;
  mode?: Mode;
}

export class SpriteSheetView extends React.Component<Props, State> {
  private canvas: React.RefObject<HTMLDivElement> = React.createRef();
  private img: React.RefObject<HTMLImageElement> = React.createRef();

  private animName: HTMLInputElement;
  private onAnimNameRef = e => {
    this.animName = e;
  }

  constructor(props) {
    super(props);

    this.state = {};
  }

  subscriber = () => {
    this.setState({});
  }

  componentDidMount() {
    this.props.model.holder.subscribe(this.subscriber);
  }

  componentWillUnmount() {
    this.props.model.holder.unsubscribe(this.subscriber);
  }

  renderRects() {
    const { model } = this.props;
    let rects = model.getRects().slice();
    if (this.state.newRect)
      rects.push(this.state.newRect);

    return rects.map((rect, idx) => {
      return this.renderRect(rect, idx);
    });
  }

  resizeRect = (event: React.MouseEvent<any>, rectIdx: number, corner: 'lt' | 'rt' | 'rb' | 'lb') => {
    const rect = this.props.model.getRects()[rectIdx];
    const map = {
      lt: { get: {x: rect.x, y: rect.y},                            set: pt => ({left: pt.x, top: pt.y})},
      rt: { get: {x: rect.x + rect.width, y: rect.y},               set: pt => ({right: pt.x, top: pt.y})},
      rb: { get: {x: rect.x + rect.width, y: rect.y + rect.height}, set: pt => ({right: pt.x, bottom: pt.y})},
      lb: { get: {x: rect.x, y: rect.y + rect.height},              set: pt => ({left: pt.x, bottom: pt.y})}
    };

    const pt = map[corner].get;
    startDragging({x: pt.x, y: pt.y, minDist: 2}, {
      onDragging: event => {
        const cssRect = {...rectToCSSRect(rect), ...map[corner].set(event)};
        this.props.model.getRects()[rectIdx] = cssRectToRect(cssRect);
        this.setState({});
      },
      onDragEnd: () => {
        this.props.model.holder.save();
      }
    })(event.nativeEvent);
  };

  renderRect(rect: Rect, idx: number) {
    const select = rect == this.props.model.getSelectRect();
    return (
      <div
        key={idx}
        onMouseDown={this.onRectMouseDown}
        className={cn(classes.rect, select && classes.rectSelect)}
        style={{left: rect.x, top: rect.y, width: rect.width, height: rect.height}}
      >
        <div className={cn(classes.corner, classes.ltCorner)} onMouseDown={e => this.resizeRect(e, idx, 'lt')}/>
        <div className={cn(classes.corner, classes.rtCorner)} onMouseDown={e => this.resizeRect(e, idx, 'rt')}/>
        <div className={cn(classes.corner, classes.rbCorner)} onMouseDown={e => this.resizeRect(e, idx, 'rb')}/>
        <div className={cn(classes.corner, classes.lbCorner)} onMouseDown={e => this.resizeRect(e, idx, 'lb')}/>
      </div>
    );
  }

  onCanvasMouseDown = (event: React.MouseEvent<any>) => {
    if (!isLeftDown(event.nativeEvent) || event.target != this.img.current)
      return;

    const { model } = this.props;
    const point = getPointOn(event);

    const rect: CSSRect = {
      left: point.x,
      top: point.y,
      right: 0,
      bottom: 0
    };

    model.setSelectRect(-1);
    startDragging({x: rect.left, y: rect.top, minDist: 2}, {
      onDragStart: event => {
        this.setState({newRect: cssRectToRect(rect)});
      },
      onDragging: event => {
        rect.right = event.x;
        rect.bottom = event.y;
        this.setState({newRect: cssRectToRect(rect)});
      },
      onDragEnd: () => {
        const rc = cssRectToRect(rect);
        if (rc.width && rc.height) {
          model.getRects().push(rc);
          model.holder.save();
        }
        model.setSelectRect(model.getRects().length - 1);
        this.setState({newRect: null});
      }
    })(event.nativeEvent);
  }

  onRectMouseDown = (event: React.MouseEvent<any>) => {
    if (!isLeftDown(event.nativeEvent))
      return;

    const { model } = this.props;
    const select = model.hitTest(getPointOn(event, this.canvas.current));
    model.setSelectRect(select);
    const selectRect = model.getSelectRect();
    if (!selectRect)
      return;

    startDragging({x: selectRect.x, y: selectRect.y, minDist: 2}, {
      onDragging: event => {
        selectRect.x = event.x;
        selectRect.y = event.y;
        this.setState({});
      },
      onDragEnd: () => {
        model.holder.save();
      }
    })(event.nativeEvent);

    event.preventDefault();
    event.stopPropagation();
  }

  onRectContextMenu = (event: React.MouseEvent<any>) => {
    event.preventDefault();
    event.stopPropagation();

    const { model } = this.props;

    const select = model.hitTest(getPointOn(event, this.canvas.current));
    model.setSelectRect(select);
    const selectRect = model.getSelectRect();
    if (!selectRect)
      return;

    const items = [
      <MenuItem
        text='remove'
        key='remove'
        onClick={() => {
          model.removeRect(select);
          model.holder.save();
        }}
      />
    ];
    ContextMenu.show(<Menu>{items}</Menu>, {left: event.clientX, top: event.clientY});
  }

  onNextFrame = () => {
    let selectIdx = this.props.model.getSelectRectIdx();
    selectIdx = (Math.max(0, selectIdx) + 1) % this.props.model.getRectsCount();
    this.props.model.setSelectRect(selectIdx);
  };

  onPrevFrame = () => {
    let selectIdx = this.props.model.getSelectRectIdx();
    selectIdx = Math.max(0, selectIdx) - 1;
    if (selectIdx < 0)
      selectIdx = this.props.model.getRectsCount() - 1;
    this.props.model.setSelectRect(selectIdx);
  };

  renderPreview() {
    const { model } = this.props;
    const rect = this.state.newRect || model.getSelectRect();
    if (!rect)
      return null;

    const style: React.CSSProperties = {
      position: 'fixed',
      backgroundColor: 'white',
      right: 16,
      top: 0
    };

    const frame: React.CSSProperties = {
      border: '1px solid black',
      backgroundImage: `url(${model.getImageUrl()})`,
      backgroundPosition: `${-rect.x}px ${-rect.y}px`,
      width: rect.width,
      height: rect.height
    };

    return (
      <div style={style}>
        <div style={{textAlign: 'right'}}>
          <i style={{padding: 3}} className='fa fa-arrow-left' onClick={this.onPrevFrame}/>
          <i style={{padding: 3}} className='fa fa-arrow-right' onClick={this.onNextFrame}/>
        </div>
        <div style={frame}/>
      </div>
    );
  }

  renderRectsTab() {
    const { model } = this.props;
    return (
      <div
        ref={this.canvas}
        className={classes.root}
        onMouseDown={this.onCanvasMouseDown}
        onContextMenu={this.onRectContextMenu}
      >
        <img src={model.getImageUrl()} ref={this.img}/>
        {this.renderRects()}
        {this.renderPreview()}
      </div>
    );
  }

  onAppendNewAnim() {
    this.setState({mode: 'add-anim'});
  }

  async appendNewAnimImpl() {
    const anim = this.props.model.getAnim();
    const newName = this.animName.value;
    if (anim.find(v => v.name == newName) != -1)
      return;

    let newAnim = new Animation(newName);
    await anim.holder.createObject(newAnim)
    anim.push( newAnim );
    anim.holder.save();
    this.setState({mode: null});
  }

  onCancelNewAnim() {
    this.setState({mode: null});
  }

  renderFrameInSequence(idx: number, rect: Rect, props: React.HTMLProps<any>, base?: Point): JSX.Element {
    return (
      <div
        key={idx}
        style={getFrameStyle(rect, this.props.model)}
        {...props as any}
      >
        {base ? <img style={{position: 'absolute', left: base.x - 9, top: base.y - 9}} src='/data/image/cross.png'/> : null}
      </div>
    );
  }

  dragBase(e: React.MouseEvent<any>, frame: FrameInfo) {
    e.stopPropagation();
    e.preventDefault();
    startDragging({x: frame.baseX || 0, y: frame.baseY || 0}, {
      onDragging: e => {
        frame.baseX = e.x;
        frame.baseY = e.y;
        this.setState({});
      },
      onDragEnd: () => this.getCurrAnim().holder.save()
    })(e.nativeEvent);
  }

  getCurrAnim(): Animation {
    const { model } = this.props;
    return model.getSelectAnim();
  }

  renderAnimTab() {
    const { model } = this.props;

    const rects = model.getRects();
    const currAnim = model.getSelectAnim();
    if (!currAnim)
      return null;

    const animRects = currAnim.frames.map((f, i) => {
      const frInfo = currAnim.frames[i] || {baseX: 0, baseY: 0, rect: 0};

      return this.renderFrameInSequence(i, rects[f.rect], {
        onDoubleClick: e => {
          currAnim.frames.splice(i, 1);
          this.setState({});
          currAnim.holder.save();
        },
        onMouseDown: e => this.dragBase(e, frInfo)
      }, {
        x: frInfo.baseX,
        y: frInfo.baseY
      });
    });

    const allFrames = rects.map((rect, i) => {
      return (
        <div
          key={i}
          style={getFrameStyle(rect, this.props.model)}
          onDoubleClick={e => {
            currAnim.frames.push({rect: i, baseX: 0, baseY: 0});
            this.setState({});
            currAnim.holder.save();
          }}
        />
      );
    });

    return (
      <React.Fragment>
        {<Preview model={this.props.model} anim={currAnim}/>}
        <div style={{whiteSpace: 'nowrap', overflow: 'auto', minHeight: 50}}>
          {animRects}
        </div>
        <div style={{whiteSpace: 'nowrap', overflow: 'auto', minHeight: 50}}>
          {allFrames}
        </div>
      </React.Fragment>
    );
  }

  renderTabContent(content: JSX.Element) {
    return (
      <div style={{position: 'absolute', top: 42, left: 0, right: 0, bottom: 0}}>
        {content}
      </div>
    );
  }

  render() {
    return (
      <Tabs id='tabs'>
        <Tab id='rects' title='rects' panel={this.renderTabContent(this.renderRectsTab())}/>
        <Tab id='anim' title='anim' panel={this.renderTabContent(this.renderAnimTab())}/>
      </Tabs>
    );
  }
}

export class SpriteConfig extends ConfigBase<DocSpriteSheetArgs> {
  private ref: React.RefObject<HTMLSelectElement> = React.createRef();

  getFiles() {
    const objs = this.props.objects();
    return objs.filter(file => {
      if (!(file instanceof FileObjectBase))
        return false;

      return ['.png', '.jpg', '.gif'].indexOf(file.getExt()) != -1
    }) as Array<FileObjectBase>;
  }

  componentDidMount() {
    const files = this.getFiles();
    this.config.source = files[0];
  }

  render() {
    if (this.props.source)
      return null;

    const files = this.getFiles();
    return (
      <div>
        <select
          ref={this.ref}
          onChange={evt => {
            this.config.source = files[evt.currentTarget.value];
          }}>
          {files.map((item, i) => {
            return <option key={i} value={i} title={item.getOriginName()}>{item.getName()}</option>;
          })}
        </select>
      </div>
    );
  }
}
