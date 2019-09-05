import { TableFileBase } from '../../base/table-file';
import { pushStat, StatMap } from 'objio/common/reader/statistics';

export function onFileUpload(obj: TableFileBase, userId: string) {
  let statMap: StatMap = {};

  obj.setStatMap({});
  obj.setRows(0);
  obj.holder.save();

  const reader = obj.getDataReader();
  let rows = 0;
  return (
    reader.readCols()
      .then(cols => {
        obj.setColumns(cols);
        obj.holder.save();
        return (
          reader.readRows({
            linesPerBunch: 100,
            onRows: args => {
              obj.setProgress(args.progress);
              rows += args.rows.length;
              pushStat({
                objs: args.rows as Array<Object>,
                statMap,
                emptyStrIsNull: true
              });
              return Promise.resolve();
            }
          })
        );
      })
      .then(() => {
        obj.setRows(rows);
        obj.setStatMap(statMap);
        obj.getColumns({ discard: true })
        .forEach(col => {
          const stat = statMap[col.name];
          if (!stat)
            return;

          if (stat.ints && !stat.nums && !stat.strs)
            col.type = 'INTEGER';
          else if (stat.nums && !stat.strs)
            col.type = 'REAL';
          else if (stat.strs) {
            if (stat.maxSize > 65536) {
              col.type = 'LONGTEXT';
            } else if (stat.maxSize > 512 ) {
              col.type = 'TEXT';
            } else {
              col.size = stat.maxSize;
              col.type = 'VARCHAR';
            }
          }
        });
        obj.holder.save();
      })
  );
}
