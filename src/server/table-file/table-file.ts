import { TableFileBase } from '../../base/table-file';
import { pushStat, StatMap } from 'objio/common/reader/statistics';

export function onFileUpload(obj: TableFileBase) {
  let statMap: StatMap = {};

  obj.setStatMap({});
  obj.setRows(0);
  obj.holder.save();

  const reading = obj.getDataReading();
  let rows = 0;
  return (
    reading.readCols()
      .then(cols => {
        obj.setColumns(cols);
        obj.holder.save();
        return (
          reading.readRows({
            linesPerBunch: 100,
            onRows: args => {
              obj.setProgress(args.progress);
              rows += args.rows.length;
              pushStat({objs: args.rows as Array<Object>, statMap, emptyStrIsNull: true});
              return Promise.resolve();
            }
          })
        );
      })
      .then(() => {
        obj.setRows(rows);
        obj.setStatMap(statMap);
        obj.getColumns({ discard: true }).forEach(col => {
          const stat = statMap[col.name];
          if (!stat)
            return;

          if (stat.ints && !stat.nums && !stat.strs)
            col.type = 'INTEGER';
          else if (stat.nums && !stat.strs)
            col.type = 'REAL';
          else if (stat.strs) {
            if (stat.maxSize < 16)
              col.type = 'VARCHAR(16)';
            else if (stat.maxSize < 32)
              col.type = 'VARCHAR(32)';
            else if (stat.maxSize < 64)
              col.type = 'VARCHAR(64)';
            else if (stat.maxSize < 128)
              col.type = 'VARCHAR(128)';
            else if (stat.maxSize < 256)
              col.type = 'VARCHAR(256)';
            else
              col.type = 'TEXT';
          }
        });
        obj.holder.save();
      })
  );
}
