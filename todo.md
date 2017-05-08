# TPIVOT TODO

## Functionality 

- Aggregator functions
    - DONE LISTAGG
    - DONE COUNT 
    - DONE AVG 
    - DONE SUM 
    - DONE MIN 
    - DONE MAX 
    - DONE VARIANCE 
    - DONE STDDEV 

- New functionality
    - GROUP BY DATE 
        - Did greg just add this as a column?
        - for date types -> Year, Month, Day, Hour
    - Can we stack row/col/val like the old pivot table?
        - Yes, think about results as an array of arrays rather than array of objects.
        - return[0] = [header]
        - return[1...] = [col_value]
    - What should happen when the user picks an invalid field (this can happen if col type is CLOB)?
    - Filters

- Error messages -- how should they be passed to the client?

## Presentation

- Can we use the jquery pivot table library's HTML table construction functions to make our new table look good?
- The list of tables is too long. Have to scroll to get to query box. Should there be either:
    - side-by-side view?
    - 2-column layout for long field lists?
- Need total rows/cols.