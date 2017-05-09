# TPIVOT TODO

## New Functionality 

- Multiple rows, cols, values in pivot?
- Implement filters
- What should happen when the user picks an invalid field (this can happen if col type is CLOB)?
    - For now, return error object.

## Infrastructure

- Get views replicated on DEV?
- Move to TELUS server?

## Presentation

- Can we use the jquery pivot table library's HTML table construction functions to make our new table look good?
- The list of tables is too long. Have to scroll to get to query box. Should there be either:
    - side-by-side view?
    - 2-column layout for long field lists?
- Need total rows/cols.

## Future dev

- Add query metadata to response, such as number of title cols