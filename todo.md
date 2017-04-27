# TPIVOT TODO

## HANDLING PIVOT QUERIES FROM CLIENT

- DONE Server will validate the model to ensure a pivot can be requested
    - DONE E.g. must have >0 row, col, val
    - DONE If model fails validation, will send `false` back to client.
- DONE Server will construct an SQL query from the model
- DONE Server will run query and return results to client

## RENDERING RESULTS

- DONE Client must render pivot results
- DONE Check whether pivot response was false--that's a no op.
- DONE Pivot table library no longer required
- DONE (TRANSFER TO SEPARATE CSS FILE) ... but we will use the pivot CSS
- Can probably use the library's HTML table construction functions, though?
- The list of tables is too long. Have to scroll to get to query box.
- Need total rows/cols.

## Functionality 

- Can we get LIST UNIQUE working as an aggregator function? Maybe LISTAGG??
- How to handle column fields that have reserved names (e.g. 'type')? Qualify with table name?
- Can we stack row/col/val like the old pivot table?
- Should there be default behavior when we don't have >0 row, col, val?
- What should happen when the user picks an invalid field (this can happen if col type is CLOB)?
- Are there fields we will NEVER use? Could stop them from being displayed.