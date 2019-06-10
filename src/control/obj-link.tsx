import * as React from 'react';

export interface Props {
  objId?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ObjLink: React.SFC<Props> = props => {
  return (
    <a
      title={props.title}
      href={props.objId != null ? ('#objId=' + props.objId) : null}
      className={props.className}
      style={{...props.style}}
    >
      {props.children}
    </a>
  );
};
