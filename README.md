# tpivot

A CodeIgniter library for querying and rendering Oracle pivot tables. Runs a pivot query from a given JSON query object, and returns the contents of the pivot table.

Also includes a basic jQuery-based pivot table explorer.

## Installation

`Datasource.php` and `Queryparser.php` should live in your `/models` directory.

Ensure that CodeIgniter is properly configured with an Oracle database. Oracle version 11g or greater is required.

## Using the library

Note: pivot table terminology can be confusing, so I use the word *fields* to represent the columns in a spreadsheet/table.

`Queryparser->make_pivot_query()` takes a JSON object representing the fields of a pivot table query. These fields resemble the ones you would use to build a pivot table in Excel:

- `Rows`: Each distinct value in these fields will be a row of the pivot table. If multiple values are added to `Rows`, the pivot table will generate a row for each unique combination of row entries.
- `Columns`: The above definition applies to `Columns`, but entry names may be mangled to comply with Oracles column naming rules.
- `Values`: The aggreate function(s) that will be calculated for every `Row`/`Column` intersection of the pivot table.
- `Filters`: Only records meeting these requirements will be included in the pivot query.

`make_pivot_query()` parses the query object and returns an SQL string. You may wish to execute the query using `Datasource->process_query()`, especially if you also plan to use the jQuery-based pivot explorer. `process_query()` returns additional metadata used by the explorer, for example in case of SQL errors.

### Queries

`Queryparser->make_pivot_query()` expects a JSON *query object* of the following shape:

```
{
    table: string_table_name,
    model: {
        Rows: [field_template],
        Columns: [field_tempalte],
        Values: [value_template]
    }
}
```

Note that query object's `model` keys are capitalized.

A field template has this shape:

```
{name: string_column_name}
```

Note that `string_column_name` must match the DB column name of interest. This means capitalization must be correct.

A value template has this shape:

```
{name: string_column_name,
reducer: oracle_agg_fn}
```

`reducer` is one of the Oracle aggregate functions. Any aggregate function will do, but beware that aggregate functions will only operate on an appropriate datatype. The `make_pivot_query()` will return an error object if asked to take, for example, the average of a VARCHAR2 column. Take special care with the `LISTAGG` function, which is handled specially to return only unique entries for a given row/column intersection.

**TODO describe LISTAGG handling**

If using this library in conjuction with the tpivot jQuery library, you may notice that query objects have some additional fields. The query object may include a `noField` entry, for all the columns in a given table/view that have not been included in the rows/columns/values. Value objects may include a `displayAs` field. You can safely ignore all of these fields.

### Responses

`make_pivot_query()` returns an SQL string. You can execute this string yourself, or wrap your use of `make_pivot_query()` in `Datasource->process_query()` to handle SQL execution and responses. This is convenient, and especially handy if you plan to use the tpivot front-end library.

`process_query()` takes the same argument as `make_pivot_query()` and returns data in the shape of:

```
// JS object notation
{
    rows: array_of_rows,
    error: did_sql_throw_error?,
    errmsg: string_oracle_err_msg_with_err_code,
    errsql: sql_that_was_executed
}
```

Where `array_of_rows` is an array of arrays. The array at index 0, the header array, contains string column names. Subsequent arrays contain table data.

