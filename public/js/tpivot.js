var tpivot = (function () {

    //////////////
    // UTILITY FNS
    //////////////

    function tableRows() {
        // Return all tr elements of the sortable table.
        return $(".sortableTable__body > tr");
    }

    function title(str) {
        // Capitalize first letter of a string.
        return str.charAt(0).toUpperCase() + str.slice(1);
    }


    ////////////////
    // COLUMN HIDING
    ////////////////

    function dehydrateColumn(target) {
        // Store column data in a button and remove column from the sortable table.
        var tar = $(target);
        var colData = tar.data("col");

        if (!colData) { return; }

        var matchingCells = orderedValuesOfCol(colData);
        var store = {
            header: colData,
            values: matchingCells.map(function (elem) {
                return elem.clone(true);
            })
        };
        var btn = $("<button>")
            .text(title(colData))
            .data("column", store)
            .appendTo($(".sortableTable__discard"))
            .click(function (event) {
                hydrateColumn(event);
            });

        tar.remove();
        $(matchingCells).each(function (idx, elem) {
            elem.remove();
        });
    }

    function hydrateColumn(event) {
        var dat = $(event.target).data();
        var values = dat.column.values;
        var head = dat.column.header;
        var th = $('<th>')
            .text(title(head))
            .attr('data-col', head)
            .addClass('value')
            .addClass('ui-sortable-handle')
            .addClass('pivotHeaderCell')
            .hover(function enter(event) {
                $(tutils.closeButton)
                    .appendTo($(this))
                    .addClass('closeButton')
                    .click(function (event) {
                        dehydrateColumn($(event.target).closest($('.pivotHeaderCell')));
                    });
            }, function exit(event) {
                $(this).children('.closeButton').remove();
            });
        $(".sortableTable__header").append(th);
        event.target.remove();

        tableRows().each(function (idx) {
            $(this).append(values[idx]);
        });
    }

    function orderedValuesOfCol(colName) {
        // Return all td elements matching a given th element.
        var ret = [];
        tableRows().each(function (idx, row) {
            var cellValue = getMatchingCell($(this), colName);
            ret.push(cellValue);
        });
        return ret;
    }


    /////////////////
    // COLUMN SORTING
    /////////////////

    function sortCells(item) {
        // Move tds matching associated sorted th to the same index as the th.
        var newIndex = $(".sortableTable__header").children().index(item);
        var column = item.data("col");

        tableRows().each(function (idx, row) {
            var matchingDataCol = getMatchingCell($(this), column);
            moveTo($(this), newIndex, $(matchingDataCol));
        });
    }

    function getMatchingCell(container, columnData) {
        // Retrieve elment from a collection matching certain data attribute.
        var ret = container
            .children()
            .filter(function () {
                return $(this).data("col") === columnData;
            })
            .first();
        return ret;
    }

    function moveTo(container, index, element) {
        // Move an element to a certin index within a container.
        // Element is first removed from children(), then then inserted.
        // The length of children() may change in between.
        var movingLeft = index < element.index();
        var elementAtGivenIndex = container.children().eq(index);
        if (movingLeft) {
            elementAtGivenIndex.before(element);
        } else {
            elementAtGivenIndex.after(element);
        }
    }


    ///////////
    // CREATION
    ///////////

    function makeTableHeaderRow(tableComponent, headings, returnedModel) {
        // Make a row of `th` cells and append to a table component (most likely a `thead`).
        var tr = $('<tr></tr>')
            .css('cursor', 'default')
            .addClass('sortableTable__header')
            .sortable({
                placeholder: "placeholder",
                items: "> .value",
                helper: "clone",
                revert: 150,
                axis: "x",
                change: function (event, ui) {
                    ui.placeholder.width(ui.helper.width);
                },
                start: function (event, ui) {
                    ui.placeholder.width(ui.item.width());
                },
                stop: function (event, ui) {
                    sortCells(ui.item);
                }
            })
            .disableSelection();
        headings.forEach(function (elem, idx) {
            // A blank column header ('') is a NULL value.
            var data = elem == "''" ? "NULL" : elem;
            var th = $('<th></th>')
                .attr('data-col', data)
                .addClass('pivotHeaderCell')
                .hover(function enter(event) {
                    $(tutils.closeButton)
                        .appendTo($(this))
                        .addClass('closeButton')
                        .click(function (event) {
                            dehydrateColumn($(event.target).closest($('.pivotHeaderCell')));
                        });
                }, function exit(event) {
                    $(this).children('.closeButton').remove();
                });
            if (returnedModel['Rows'] && idx >= returnedModel['Rows'].length) {
                th.addClass('value');
            }
            th.html(data);
            th.appendTo(tr);
        });
        tr.appendTo(tableComponent);
    };

    function makeSingleTableRow(tableComponent, rowData, headerRow) {
        // Make a single table body row and append it to a table component (most likely a `tbody`).
        var row = $('<tr></tr>');
        rowData.forEach(function (val, idx) {
            // Blank row headers ('') should display as NULL.
            var headerData = headerRow[idx] == "''" ? 'NULL' : headerRow[idx];
            var data = idx === 0 ? val || "NULL" : val || "";
            var cell = $('<td></td>')
                .addClass("pvtVal")
                .attr('data-col', headerData);
            cell.html(data);
            cell.appendTo(row);
        });
        row.appendTo(tableComponent);
    };

    function makeTable(container, pivotData, returnedModel) {
        var table = $('<table></table>')
            .addClass('queryBuilder--marginLeft queryBuilder--marginTop')
            .addClass("pvtTable");
        table.appendTo(container);

        var thead = $('<thead></thead>')
            .addClass('sortableTable');
        makeTableHeaderRow(thead, pivotData[0], returnedModel);
        thead.appendTo(table);

        var tbody = $('<tbody></tbody>')
            .addClass('sortableTable__body');
        pivotData.forEach(function (row, idx) {
            if (idx === 0) {
                return;
            }
            makeSingleTableRow(tbody, row, pivotData[0]);
        });
        tbody.appendTo(table);
    };

    function makeErrorPanel(containerDiv, resultsObj) {
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

    function makeTimeoutPanel(containerDiv) {
        var headline = $('<h1></h1>')
            .html('Error in pivot query!')
            .addClass('pivot__errorBanner');
        var subhead = $('<h2></h2>')
            .html('Request timed out.');
        var errorText = $('<div></div>')
            .html('The database might be too busy right now. Pivot queries with many fields can also take too long to return.')
            .addClass('smallPadding');

        var errDiv = $('<div></div>')
        errDiv.appendTo(containerDiv);
        errDiv.append(headline, subhead, errorText);
    }

    function makePivotContainer(model) {
        var containerDiv = $('<div></div>')
            .addClass('pivotContainer')
            .addClass('queryBuilder--marginLeft')
            .attr('id', 'pivotTable');
        var headerDiv = $('<div class="pivotContainer__titleContainer"></div>')
            .addClass('queryBuilder__child--notSelectable')
            .disableSelection()
            .append($('<div>')
                .addClass('pivotContainer__titleText')
                .text('Pivot Query Results: '))
            .append($('<div>')
                .addClass('pivotContainer__titleModelDescription')
                .text(tutils.describeModel(model)));
        var discard = $('<div>')
            .addClass('sortableTable__discard');

        containerDiv.appendTo($('#pivotTarget'));
        containerDiv.append(headerDiv, discard);
        return containerDiv;
    };

    function removePivot() {
        $('#pivotTable').remove();
    }


    function makeExpressiveTable(containerElement, data) {
        var meta = data.meta;
        var results = data.results;

        tutils.sortMetaCols(meta);
        var headerRowContent = tutils.cartesianProduct(meta.columns);
        var allCoords = tutils.allMetaCoordinates(data);
        var rowCoords = allCoords.rowCoords;
        var colCoords = headerRowContent;
        var aggCoords = allCoords.aggCoords;

        console.log(results);

        // create the table header.
        var thead = $('<thead>');
        meta.columns.map(function (colArray, colArrayPosition) {
            var tr = $('<tr>');
            if (colArrayPosition === 0) {
                var initialTrBlock =
                    $('<th>')
                        .attr({
                            colspan: (meta.rows.length),
                            rowspan: (meta.columns.length)
                        })
                        .appendTo(tr);
            }
            headerRowContent
                .map(function (coord) {
                    return coord[colArrayPosition];
                })
                .reduce(function (acc, next) {
                    if (acc.length === 0) {
                        return [next];
                    }
                    if (acc[acc.length - 1] === next) {
                        return acc;
                    } else {
                        return acc.concat([next]);
                    }
                }, [])
                .map(function (elem, _, arr) {
                    var th =
                        $('<th>')
                            .addClass('table__colHeader')
                            .attr({
                                colspan: (headerRowContent.length / arr.length),
                            })
                            .text(elem)
                            .appendTo(tr);
                });
            tr.appendTo(thead);
        });


        var tbody = $('<tbody>');
        rowCoords.map(function (rowCoord) {
            var tr = $('<tr>');
            rowCoord.map(function (elem) {
                var td =
                    $('<td>')
                        .text(elem)
                        .addClass('table__rowHeader')
                        .appendTo(tr);
            });
            colCoords.map(function (colCoord) {
                aggCoords.map(function (aggCoord) {
                    var cellValue = '';
                    if (results[rowCoord]
                        && results[rowCoord][colCoord]
                        && results[rowCoord][colCoord][aggCoord]
                        && results[rowCoord][colCoord][aggCoord].value) {
                        cellValue = results[rowCoord][colCoord][aggCoord].value;
                    }
                    var td =
                        $('<td>')
                            .text(cellValue)
                            .appendTo(tr);
                });
            });
            tr.appendTo(tbody);
        });


        var table = $('<table>').addClass('table table-bordered table-hover');
        thead.appendTo(table);
        tbody.appendTo(table);
        table.appendTo(containerElement);
    }


    function renderPivot(pivotData) {
        if (pivotData.results === false) { return; }

        removePivot();
        var container = makePivotContainer(pivotData.model);

        if (pivotData.results.error) {
            makeErrorPanel(container, pivotData.results);
            return;
        }
        //makeTable(container, pivotData.results.rows, pivotData.model);
        makeExpressiveTable(container, pivotData.results.rows);
        window.currentPivotResult = pivotData;
    };

    function renderTimeout() {
        removePivot();
        var container = makePivotContainer();
        makeTimeoutPanel(container);
    }

    return {
        renderPivot: renderPivot,
        renderTimeout: renderTimeout,
        removePivot: removePivot
    };
})();