var tpivot = (function () {
    var makeTableHeaderRow = function (tableComponent, headings) {
        // Make a row of `th` cells and append to a table component (most likely a `thead`).
        var tr = $('<tr></tr>');
        headings.forEach(function (elem) {
            var th = $('<th></th>');
            // A blank column header ('') is a NULL value.
            var data = elem == "''" ? "NULL" : elem;
            th.html(data);
            th.appendTo(tr);
        });
        tr.appendTo(tableComponent);
    }

    var makeSingleTableRow = function (tableComponent, rowData) {
        // Make a single table body row and append it to a table component (most likely a `tbody`).
        var row = $('<tr></tr>');
        rowData.forEach(function (val, idx) {
            // Blank row headers ('') should display as NULL.
            var data = idx === 0 ? val || "NULL" : val || "";
            var cell = $('<td></td>').addClass("pvtVal");
            cell.html(data);
            cell.appendTo(row);
        });
        row.appendTo(tableComponent);
    };

    var makeTable = function (pivotData) {
        var table = $('<table></table>')
            .attr("id", "pivotTable")
            .addClass("pvtTable");
        table.appendTo($('#pivotTarget'));

        var thead = $('<thead></thead>');
        makeTableHeaderRow(thead, pivotData[0]);
        thead.appendTo(table);

        var tbody = $('<tbody></tbody>');
        pivotData.forEach(function (row, idx) {
            if (idx === 0) {
                return;
            }
            makeSingleTableRow(tbody, row);
        });
        tbody.appendTo(table);
    };

    var renderPivot = function (pivotData) {
        $('#pivotTable').remove();
        if (pivotData.results === false) { return; }
        var passedModel = pivotData.model;
        var queryResults = pivotData.results;
        makeTable(queryResults);
    };

    return {
        renderPivot: renderPivot
    };
})();