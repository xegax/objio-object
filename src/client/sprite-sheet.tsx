import * as React from 'react';
import { OBJIOArray } from 'objio';
import { Point, Rect, inRect } from '../common/point';
import { FileObjectBase } from '../base/file-object';
import { AppComponent } from 'ts-react-ui/app-comp-layout';
import {
  PropSheet,
  PropsGroup,
  PropItem,
  TextPropItem,
  DropDownPropItem,
  SliderPropItem
} from 'ts-react-ui/prop-sheet';
import {
  SpriteSheetBase,
  AnimationBase as Animation,
  FrameInfo
} from '../base/sprite-sheet';

export { Animation, FrameInfo };

export interface DocSpriteSheetArgs {
  source?: FileObjectBase;
}

export class SpriteSheet extends SpriteSheetBase {
  private selectAnim: Animation;
  private selectRect: Rect;
  private playFrame: number = 0;
  private playing: boolean = false;
  private playInterval: number = 10;
  private newAnimName: string;
  private editAnimName: string;

  constructor(args?: DocSpriteSheetArgs) {
    super();

    if (!args)
      return;

    this.file = args.source;
  }

  togglePlay() {
    this.playing = !this.playing;
    this.holder.delayedNotify();
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getPlayInterval() {
    return this.playInterval;
  }

  setPlayInterval(ms: number) {
    if (this.playInterval == ms)
      return;

    this.playInterval = ms;
    this.holder.delayedNotify();
  }

  getSelectAnim(): Animation {
    return this.selectAnim;
  }

  setSelectAnim(idx: number) {
    const anim = this.anim.get(idx);
    if (anim == this.selectAnim)
      return;

    this.playFrame = 0;
    this.selectAnim = anim;
    this.holder.delayedNotify();
  }

  getSelectRect(): Rect {
    return this.selectRect;
  }

  setSelectRect(idx: number) {
    const rect = this.rects[idx];
    if (this.selectRect == rect)
      return;

    this.selectRect = rect;
    this.holder.delayedNotify();
  }

  getSelectRectIdx(): number {
    return this.rects.indexOf(this.selectRect);
  }

  getImageUrl(): string {
    if (!this.file)
      return '';

    return this.file.getPath();
  }

  getRects(): Array<Rect> {
    return this.rects;
  }

  getRectsCount(): number {
    return this.rects.length;
  }

  removeRect(idx: number): boolean {
    if (!this.rects.splice(idx, 1).length)
      return false;

    this.holder.delayedNotify();
    return true;
  }

  getAnim(): OBJIOArray<Animation> {
    return this.anim;
  }

  hitTest(point: Point): number {
    return this.rects.findIndex(rect => inRect(rect, point));
  }

  private startToCreateNewAnim() {
    this.newAnimName = 'anim ' + this.anim.getLength();
    this.holder.delayedNotify();
  }

  private startToEditAnimName() {
    if (!this.selectAnim)
      return;

    this.editAnimName = this.selectAnim.name;
    this.holder.delayedNotify();
  }

  private createNewAnim(name: string) {
    this.newAnimName = null;
    let newAnim = new Animation(name);
    this.holder.createObject<Animation>(newAnim)
    .then(() => {
      this.anim.push(newAnim);
      this.anim.holder.save();
      this.setSelectAnim(this.anim.getLength() - 1);
    });
  }

  private finishToEditAnimName(name: string) {
    this.editAnimName = null;
    if (!this.selectAnim)
      return;

    this.selectAnim.name = name;
    this.selectAnim.holder.save();
    this.holder.delayedNotify();
  }

  removeSelectAnim() {
    if (!this.selectAnim)
      return;

    const idx = this.anim.find(item => item == this.selectAnim);
    this.anim.remove(idx);
    this.setSelectAnim(Math.min(Math.max(idx, 0), this.anim.getLength() - 1));
    this.anim.holder.save();
    this.holder.delayedNotify();
  }

  renderAnimation(): JSX.Element {
    return (
      <PropsGroup label='animation'>
        {(this.newAnimName || this.editAnimName) ? 
          <TextPropItem
            autoFocus
            value={this.newAnimName || this.editAnimName}
            onEnter={name => {
              this.newAnimName && this.createNewAnim(name);
              this.editAnimName && this.finishToEditAnimName(name);
            }}
            onCancel={() => {
              this.newAnimName = null;
              this.editAnimName = null;
              this.holder.delayedNotify();
            }}
          />
        : <DropDownPropItem
            left={[
              <i key='1' className='fa fa-plus' onClick={() => this.startToCreateNewAnim()}/>,
              <i key='2' className='fa fa-edit' onClick={() => this.startToEditAnimName()}/>
            ]}
            right={[<i className='fa fa-trash' onClick={() => this.removeSelectAnim()}/>]}
            value={this.selectAnim ? {
              value: this.selectAnim.holder.getID(),
              render: this.selectAnim.name
            } : null}
          values={this.anim.getArray().map(anim => {
            return {
              value: anim.holder.getID(),
              render: anim.name
            };
          })}
          onSelect={anim => {
            const idx = this.anim.find(id => id.holder.getID() == anim.value);
            this.setSelectAnim(idx);
          }}
        />}
        {this.selectAnim && <PropItem label='frames' value={this.selectAnim.frames.length}/>}
        {this.selectAnim && 
          <SliderPropItem
            left={[
              <i
                className={this.playing ? 'fa fa-stop' : 'fa fa-play'}
                onClick={() => this.togglePlay()}
              />
            ]}
            disabled={this.selectAnim.frames.length == 1}
            inline={false}
            label='play'
            min={0}
            max={this.selectAnim.frames.length - 1}
            round
            value={this.playFrame}
            onChange={value => {
              this.setPlayFrame(value);
            }}
          />
        }
        {this.selectAnim &&
          <TextPropItem
            label='frame'
            value={this.playFrame}
            onChanged={value => {
              this.setPlayFrame(Math.round(+value));
            }}
          />
        }
        <TextPropItem
          label='interval'
          value={this.playInterval}
          onChanged={value => {
            this.setPlayInterval(+value);
          }}
        />
      </PropsGroup>
    );
  }

  setPlayFrame(frame: number) {
    if (this.playFrame == frame)
      return;

    this.playFrame = frame;
    if (this.selectAnim)
      this.playFrame = this.playFrame % this.selectAnim.frames.length;
    this.holder.notify();
  }

  getPlayFrame() {
    return this.playFrame;
  }

  renderCurrFrame(): JSX.Element {
    if(!this.selectRect)
      return null;

    const rect = this.selectRect;
    return (
      <PropsGroup label='selected frame'>
        <TextPropItem
          label='x'
          value={rect.x}
          onChanged={value => {
            rect.x = +value;
            this.holder.delayedNotify();
          }}
        />
        <TextPropItem
          label='y'
          value={rect.y}
          onChanged={value => {
            rect.y = +value;
            this.holder.delayedNotify();
          }}
        />
        <TextPropItem
          label='width'
          value={rect.width}
          onChanged={value => {
            rect.width = +value;
            this.holder.delayedNotify();
          }}
        />
        <TextPropItem
          label='height'
          value={rect.height}
          onChanged={value => {
            rect.height = +value;
            this.holder.delayedNotify();
          }}
        />
      </PropsGroup>
    );
  }

  getAppComponents(): Array<JSX.Element> {
    return [
      <AppComponent id='config' faIcon='fa fa-sliders'>
        <PropSheet>
          <PropsGroup label='frames'>
            <PropItem label='count' value={this.rects.length}/>
            {this.renderCurrFrame()}
          </PropsGroup>
          {this.renderAnimation()}
        </PropSheet>
      </AppComponent>
    ];
  }
}
