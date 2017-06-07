# TPIVOT TODO

## New UI

- Show UI chrome when request is being made (e.g. spinner?)
- Query pane layout changes
- 2 col: fields on left, sort buckets on right
- fields can be placed into any of the 4 boxes, and can be duped
- fields are no longer removed from field list on drag
- fields have symbols (col/row/filter/val) to indicate which boxes they are in


## New Functionality 

- Multiple cols
    - multiple columns is doable, see https://stackoverflow.com/questions/38696067/oracle-sql-pivot-on-multiple-columns-fields
- Multiple values
    - and multiple values on same field
- Implement filters
    - Should just be 'where X (comparator) Y'--doesn't interact w/ fields selected for row/col/values

## Presentation
- Ability to right-click on cols and rows to group (from BJ)
- Ability to sort columns left and right by drag and drop
    - e.g. if we want Closed, pendingclose, open, then all the other columns in that order and ability to filter out closedresolved, closedfollowupcompleted, and working

## Future dev

- Add query metadata to response, such as number of title cols