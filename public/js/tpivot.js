var tpivot = (function () {
    var makeHeaderArray = function (passedModel, pivotRow) {
        var cols = [];
        Object.keys(pivotRow).forEach(function (elem) {
            if (elem === firstCol) {
                return;
            } else {
                cols.push(elem);
            }
        });
        cols.sort();
        var firstCol = passedModel.Rows[0].name;
        cols = cols.filter(function (elem) {
            return elem !== firstCol;
        })
        return [firstCol].concat(cols);
    };

    var makeTableHeaderRow = function (tableComponent, headings) {
        // Make a row of `th` cells and append to a table component (most likely a `thead`).
        var tr = $('<tr></tr>');
        headings.forEach(function (elem) {
            var th = $('<th></th>');
            // A blank column header ('') is a NULL value.
            th.text(elem === '' ? "NULL" : elem);
            th.appendTo(tr);
        });
        tr.appendTo(tableComponent);
    }

    var makeSingleTableRow = function (tableComponent, headings, rowData) {
        // Make a single table body row and append it to a table component (modt likely a `tbody`).
        var row = $('<tr></tr>');
        headings.forEach(function (colName, idx) {
            // Blank row headers ('') should display as NULL.
            // The row header is always in position 0 of the row data array.
            var data = idx === 0 ? rowData[colName] || "NULL" : rowData[colName] || "";
            var cell = $('<td></td>').addClass("pvtVal");
            cell.html(data);
            cell.appendTo(row);
        });
        row.appendTo(tableComponent);
    };

    var makeTable = function (headerArray, pivotData) {
        var table = $('<table></table>')
            .attr("id", "pivotTable")
            .addClass("pvtTable");
        table.appendTo($('#pivotTarget'));

        var thead = $('<thead></thead>');
        makeTableHeaderRow(thead, headerArray);
        thead.appendTo(table);

        var tbody = $('<tbody></tbody>');
        pivotData.forEach(function (row) {
            makeSingleTableRow(tbody, headerArray, row);
        });
        tbody.appendTo(table);
    };

    var renderPivot = function (pivotData) {
        $('#pivotTable').remove();
        if (pivotData.results === false) { return; }
        var passedModel = pivotData.model;
        var queryResults = pivotData.results;
        console.table(queryResults);
        var headerArray = makeHeaderArray(passedModel, queryResults[0]);
        queryResults.sort(function (a, b) {
            return a[headerArray[0]] === b[headerArray[0]] ? 0 : +(a[headerArray[0]] > b[headerArray[0]]) || -1;
        })
        makeTable(headerArray, queryResults);
    };

    return {
        renderPivot: renderPivot
    };
})();