# TPIVOT TODO

## Functionality 

- Can we get LIST UNIQUE working as an aggregator function? Maybe LISTAGG??
- GROUP BY DATE 
    - for date types -> Year, Month, Day, Hour
- Should there be default behavior when we don't have >0 row, col, val?
    - Yes, requirement for at least (len col) == 0. User should select row and val, and see a 'spreadsheet' view.
- Can we stack row/col/val like the old pivot table?
- What should happen when the user picks an invalid field (this can happen if col type is CLOB)?
- Are there fields we will NEVER use? Could stop them from being displayed.

## Presentation

- Can we use the jquery pivot table library's HTML table construction functions to make our new table look good?
- The list of tables is too long. Have to scroll to get to query box. Should there be either:
    - side-by-side view?
    - 2-column layout for long field lists?
- Need total rows/cols.