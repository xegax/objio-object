import * as React from 'react';
import { IconMap } from 'ts-react-ui/common/icon-map';
import { IconSVG } from 'ts-react-ui/icon-svg';
import * as JSONIcon from '../images/json-file-type.svg';
import * as CSVIcon from '../images/csv-file-type.svg';
import * as FSIcon from '../images/file-storage.svg';
import * as TableIcon from '../images/table.svg';
import * as DatabaseIcon from '../images/database.svg';
import * as MP4Icon from '../images/mp4.svg';
import * as ImageIcon from '../images/image.svg';
import * as BlankIcon from '../images/blank-type.svg';
import * as StringType from '../images/string-type.svg';
import * as TextType from '../images/text-type.svg';
import * as DoubleType from '../images/double-type.svg';
import * as IntegerType from '../images/integer-type.svg';

export function registerAll() {
  IconMap.get().append({
    'json-icon': () => <IconSVG icon={JSONIcon} />,
    'csv-icon': () => <IconSVG icon={CSVIcon}/>,
    'fs-icon': () => <IconSVG icon={FSIcon}/>,
    'table-icon': () => <IconSVG icon={TableIcon}/>,
    'database-icon': () => <IconSVG icon={DatabaseIcon}/>,
    'mp4-icon': () => <IconSVG icon={MP4Icon}/>,
    'image-icon': () => <IconSVG icon={ImageIcon}/>,
    'blank-icon': () => <IconSVG icon={BlankIcon}/>,
    'string-type': () => <IconSVG icon={StringType}/>,
    'text-type': () => <IconSVG icon={TextType}/>,
    'double-type': () => <IconSVG icon={DoubleType}/>,
    'integer-type': () => <IconSVG icon={IntegerType}/>
  });
}
