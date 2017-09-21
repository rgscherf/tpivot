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


    function makeExpressiveTable(containerElement, data, renderFieldNames, model) {
        var meta = data.meta;
        var results = data.results;

        tutils.sortMetaCols(meta);
        var allCoords = tutils.allMetaCoordinates(data);
        var rowCoords = allCoords.rowCoords;
        var colCoords = allCoords.colCoords;
        var aggCoords = allCoords.aggCoords;


        ////////////////////////
        // DRAW THE TABLE HEADER
        ////////////////////////
        var thead = $('<thead>');


        // Drawing column headers
        if (meta.columns.length === 0) {
            var tr = $('<tr>');
            if (renderFieldNames) {
                // start with N <th> spacers where N is the number of row fields.
                // if N==0, add a <th> spacer for the dummy 'all rows' label.
                if (meta.rows.length === 0) {
                    $('<th>').appendTo(tr);
                } else {
                    meta.rows.map(function () {
                        $('<th>').appendTo(tr);
                    });
                }
                // then add a label for the field sharing the same column index in the client model.
                $('<th>')
                    .text("ALL COLS")
                    .addClass('table__columnLabel')
                    .appendTo(tr);
            } else {
                // if column labels are disabled, just create a <th> block sized to accommodate column and row labels.
                $('<th>')
                    .attr({
                        colspan: (meta.rows.length),
                    })
                    .appendTo(tr);
            }

            meta.aggregators.map(function (_) {
                $('<th>')
                    .text('*')
                    .addClass('table__colHeader')
                    .attr({
                        colspan: (allCoords)
                    })
                    .appendTo(tr);
            });
            tr.appendTo(thead);
        } else {
            meta.columns.map(function (colArray, colArrayPosition) {
                var tr = $('<tr>');
                // render column labels.
                if (renderFieldNames) {
                    // start with N <th> spacers where N is the number of row fields.
                    // if N==0, add a <th> spacer for the dummy 'all rows' label.
                    if (meta.rows.length === 0) {
                        $('<th>').appendTo(tr);
                    } else {
                        meta.rows.map(function () {
                            $('<th>').appendTo(tr);
                        });
                    }
                    // then add a label for the field sharing the same column index in the client model.
                    var labelText = model["Columns"][colArrayPosition].name;
                    $('<th>')
                        .text(labelText)
                        .addClass('table__columnLabel')
                        .appendTo(tr);
                } else {
                    // if column labels are disabled, just create a <th> block sized to accommodate column and row labels.
                    if (colArrayPosition === 0) {
                        var initialTrBlock =
                            $('<th>')
                                .attr({
                                    colspan: (meta.rows.length),
                                    rowspan: (meta.columns.length + 1) // the +1 is for the agg label row, which know is always length 1.
                                })
                                .appendTo(tr);
                    }
                }
                // now, take the cartesian product of all column labels and...
                colCoords
                    // get the label at the same column field index we are currently looking at...
                    .map(function (coord) {
                        return coord[colArrayPosition];
                    })
                    // remove identical adjacent elements...
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
                    // and then draw <th> with those labels, sizing those elements so that the length of this row matches all other header rows.
                    .map(function (elem, _, arr) {
                        // The guard here ensures that arr of length 1 (that is, all elements in the previous map step were identical)
                        // displays as width-1 cells rather than a single cell spanning the whole row.
                        var colSpan = (meta.aggregators.length * (colCoords.length / arr.length))
                        var th =
                            $('<th>')
                                .addClass('table__colHeader')
                                .attr({
                                    colspan: colSpan
                                })
                                .click(function () {
                                    if (arr.length > 1) {
                                        pivotState.onHeaderClick('column', colArrayPosition, elem);
                                        rerenderTable();
                                    }
                                })
                                .text(elem)
                                .appendTo(tr);
                    });
                tr.appendTo(thead);
            });
        }


        // drawing agg headers
        var aggTr = $('<tr>');
        var aggregatorsIsEmpty = meta.aggregators.length === 0;
        if (renderFieldNames) {
            // start with N <th> spacers where N is the number of row fields.
            // if N==0, add a <th> spacer for the dummy 'all rows' label.
            if (meta.rows.length === 0) {
                $('<th>').appendTo(aggTr);
            } else {
                meta.rows.map(function () {
                    $('<th>').appendTo(aggTr);
                });
            }
            $('<th>')
                .text('AGGREGATORS')
                .addClass('table__columnLabel')
                .appendTo(aggTr)
        } else if (meta.columns.length === 0) {
            $('<th>')
                .attr({
                    colspan: (meta.rows.length),
                })
                .appendTo(aggTr);
        }
        colCoords.map(function (colCoord) {
            aggCoords.map(function (aggName) {
                var aggLabel = aggregatorsIsEmpty ? 'COUNT(*)' : aggName;
                $('<th>')
                    .addClass('table__colHeader')
                    .click(function () {
                        if (!aggregatorsIsEmpty && aggCoords.length > 1) {
                            pivotState.onHeaderClick('aggregator', aggCoords.indexOf(aggName), aggLabel);
                            rerenderTable();
                        }
                    })
                    .text(aggLabel)
                    .appendTo(aggTr);
            });
        });
        aggTr.appendTo(thead);


        //////////////////////
        // DRAW THE TABLE BODY
        //////////////////////

        var tbody = $('<tbody>');
        // Rendering row labels
        if (renderFieldNames) {
            var t = $('<tr>');
            var rowLabels = [];
            if (meta.rows.length === 0) {
                rowLabels = [
                    $('<th>')
                        .text('ALL ROWS')
                        .addClass('table__rowLabel')
                ];

            } else {
                rowLabels = meta.rows.map(function (_, rowArrayPosition) {
                    return $('<th>')
                        .text(model['Rows'][rowArrayPosition].name)
                        .addClass('table__rowLabel');
                });
            }
            var emptyLength = meta.aggregators.length * colCoords.length;
            var emptyLabels = [];
            for (var i = 0; i < emptyLength; i++) {
                emptyLabels.push($('<th>'));

            }
            rowLabels.forEach(function (elem) {
                elem.appendTo(t);
            });
            emptyLabels.forEach(function (elem) {
                elem.appendTo(t);
            });
            $('<th>').appendTo(t);
            t.appendTo(tbody);
        }

        // Each row in the cartesian product of row values is drawn here.
        rowCoords.map(function (rowCoord) {
            var tr = $('<tr>');

            // If there are no rows (e.g. just pivoting on '*'), insert a label cell.
            if (meta.rows.length === 0) {
                $('<td>')
                    .text('*')
                    .addClass('table__rowHeader')
                    .appendTo(tr);
            } else {
                rowCoord.map(function (elem) {
                    $('<td>')
                        .click(function () {
                            var rowIdx = rowCoord.indexOf(elem);
                            if (meta.rows[rowIdx].length > 1) {
                                pivotState.onHeaderClick('row', rowIdx, elem);
                                rerenderTable();
                            }
                        })
                        .text(elem)
                        .addClass('table__rowHeader')
                        .appendTo(tr);
                });
            }

            // If we're printing field names, insert a spacer cell where column labels will be drawn.
            if (renderFieldNames) {
                $('<td>').appendTo(tr);
            }

            // Now draw cell values, iterating through column and agg coords.
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

            // And finally append to the tbody.
            tr.appendTo(tbody);
        });


        var table = $('<table>').addClass('table table-bordered table-hover table-condensed');
        thead.appendTo(table);
        tbody.appendTo(table);
        table.appendTo(containerElement);

        makeRemovedElementBox(containerElement);
    }

    function makeRemovedElementBox(containerElement) {
        function createFlexDiv(transform, transformField, container) {
            var modelField;
            var shortFieldName;
            switch (transformField) {
                case 'excludedRows':
                    modelField = 'Rows';
                    shortFieldName = 'row';
                    break;
                case 'excludedColumns':
                    modelField = 'Columns';
                    shortFieldName = 'column';
                    break;
                case 'excludedAggregators':
                    modelField = 'Values';
                    shortFieldName = 'aggregator';
                    break;

            }

            if (transformField === 'excludedAggregators') {
                var arrDiv = $('<tr>');
                $('<th>')
                    .appendTo(arrDiv);
                transform[transformField].forEach(function (elem) {
                    $('<td>')
                        .text(elem)
                        .css({ 'padding-left': '10px', 'padding-right': '10px' })
                        .click(function () {
                            pivotState.restoreElement(shortFieldName, model[modelField].map(function (e) { return e.reducer + "(" + e.name + ")" }).indexOf(elem), elem);
                            rerenderTable();
                        })
                        .appendTo(arrDiv);
                });
                arrDiv.appendTo(container);
            } else {
                transform[transformField].forEach(function (excludedArr, excludedIdx) {
                    var arrDiv = $('<tr>');
                    $('<th>')
                        .text(model[modelField][excludedIdx].name)
                        .css('padding-left', '10px')
                        .appendTo(arrDiv);
                    excludedArr.forEach(function (elem) {
                        $('<td>')
                            .text(elem)
                            .css({ 'padding-left': '10px', 'padding-right': '10px' })
                            .click(function () {
                                pivotState.restoreElement(shortFieldName, excludedIdx, elem);
                                rerenderTable();
                            })
                            .appendTo(arrDiv);
                    });
                    arrDiv.appendTo(container);
                });
            }
        }


        var model = pivotState.getModel();
        var transform = pivotState.getCurrentTransform();
        var innerContainer = $('<div>');
        var title = $('<div>')
            .addClass('pivotContainer__titleContainer pivotContainer__titleText')
            .text('Excluded Fields')
            .appendTo(innerContainer);

        var table = $('<table>')
            .addClass('table-condensed');

        $('<tr>')
            .append($('<th>')
                .addClass('info')
                .text('Excluded Rows'))
            .appendTo(table);
        createFlexDiv(transform, 'excludedRows', table);

        $('<tr>')
            .append($('<th>')
                .addClass('info')
                .text('Excluded Columns'))
            .appendTo(table);
        createFlexDiv(transform, 'excludedColumns', table);

        $('<tr>')
            .append($('<th>')
                .addClass('info')
                .text('Excluded Aggregators'))
            .appendTo(table);
        createFlexDiv(transform, 'excludedAggregators', table);

        table.appendTo(innerContainer);
        innerContainer.appendTo(containerElement);
    }

    function rerenderTable() {
        removePivot();
        var currentModel = pivotState.getModel();
        var container = makePivotContainer(currentModel);
        var calculatedResults = pivotState.applyTransform();
        makeExpressiveTable(container, calculatedResults, true, currentModel)
    }


    function renderPivot(pivotData) {
        if (pivotData.results === false) { return; }

        removePivot();
        var container = makePivotContainer(pivotData.model);

        if (pivotData.error) {
            makeErrorPanel(container, pivotData);
            return;
        }
        pivotState.registerResults(pivotData);
        var calculatedTable = pivotState.applyTransform();
        makeExpressiveTable(container, calculatedTable, true, pivotData.model);
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