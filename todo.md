# TPIVOT TODO

- Charting
    - Multiple aggreagates
    - Bar chart (look into grouping)
    - Hook up show/hide buttons
- Column aliasing + rehydration
    - Look into allowed column name chars
    - See item 6 here: https://docs.oracle.com/cd/B19306_01/server.102/b14200/sql_elements008.htm
    - Consider separating name parts with special char sequence # and $
    - And separating col values from agg info with additional sequence
    - Add rehydration into response.