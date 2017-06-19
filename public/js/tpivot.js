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
    };

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

    var makeTable = function (container, pivotData) {
        var table = $('<table></table>')
            .addClass("pvtTable");
        table.appendTo(container);

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

    var makeErrorPanel = function (containerDiv, resultsObj) {
        var errmsg = resultsObj.errmsg;
        var errsql = resultsObj.errsql;

        var headline = $('<h1></h1>').html('Error in pivot query!').addClass('pivot__errorBanner');
        var sqlline = $('<h2></h2>').html('The SQL query');
        var sqltext = $('<div></div>').html(errsql).addClass('smallPadding');
        var msgline = $('<h2></h2>').html('Returned error message:');
        var msgtext = $('<div></div>').html(errmsg).addClass('smallPadding');

        var errDiv = $('<div></div>')
        errDiv.appendTo(containerDiv);
        errDiv.append(headline, sqlline, sqltext, msgline, msgtext);
    };

    var makePivotContainer = function () {
        var containerDiv = $('<div></div>')
            .attr('id', 'pivotTable');
        var spacerDiv = $('<div></div>')
            .addClass('queryBuilder__spacer');
        var headerDiv = $('<div></div>')
            .addClass('queryBuilder--headerText')
            .text('Query results');

        containerDiv.appendTo($('#pivotTarget'));
        containerDiv.append(spacerDiv, headerDiv);
        return containerDiv;
    };

    var renderPivot = function (pivotData) {
        $('#pivotTable').remove();
        if (pivotData.results === false) { return; }
        var container = makePivotContainer();
        if (pivotData.results.error) {
            makeErrorPanel(container, pivotData.results);
            return;
        }
        makeTable(container, pivotData.results.rows);
    };

    return {
        renderPivot: renderPivot
    };
})();