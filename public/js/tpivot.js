var tpivot = (function () {

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

    /////////////////////////////
    // SORTING ROW/COL/AGG LABELS
    /////////////////////////////

    // Options for defining sortable behavior of column headers.
    // This has two main behaviors:
    // 1. Where a field's labels repeat in the same row (because there is a field above in the hierarchy),
    // ... sorting is restricted to only the items underneath the same hierarchical header.
    // 2. When the user 'drops' an item, a transform is triggered and the table redraws
    // ... with all repetitions of the sorted field sorted as the user directed.

    // Identifying sort elements
    // In-group sorting is done by setting a data attribute on each header with the form:
    // data('group') = '(row | col | agg |)' + '__sortInfo__' + fieldIdx + '__sortInfo__' + sortingGroupNum
    // We can split this string on '__sortInfo__' to get individual pieces of data.
    // Call the split array SRT, and:
    // SRT[0] describes which meta field is being changed.
    // SRT[1] describes which index of the meta field is being changed. For rows and cols, this is a label array index.
    // ... for aggregators, this is just the name of the aggregator being sorted.
    // SRT[2] describes which iteration we're on for the meta field being changed. By finding all elements which 
    // ... match this part of the signature after sorting completes, we can build a list of field labels in the user's desired order.
    var sortableOptions = {
        placeholder: "placeholder",
        items: "> .sortableValue",
        helper: "clone",
        forcePlaceholderSize: true,
        revert: 150,
        axis: "x",
        update: function (event, ui) {
            var dat = ui.item.data('group');
            var labels = [];
            $('.' + dat).each(function (idx, elem) {
                labels.push($(elem).text());
            });
            var direction = dat.split('__sortInfo__')[0];
            var index = dat.split('__sortInfo__')[1];
            pivotState.sortField(direction, index, labels);
            $('.sortableColumn').sortable('option', 'items', '> .sortableValue');
            rerenderTable();
        }
    };

    function makeExpressiveTableHead(allCoords, thead, data, renderFieldNames, model) {
        var meta = data.meta;

        var rowCoords = allCoords.rowCoords;
        var colCoords = allCoords.colCoords;
        var aggCoords = allCoords.aggCoords;


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
            meta.columns.map(function (colArray, columnArrayIndex) {
                var tr = $('<tr>')
                    .addClass('sortableColumn')
                    .sortable(sortableOptions);
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
                    var labelText = model["Columns"][columnArrayIndex].name;
                    $('<th>')
                        .text(labelText)
                        .addClass('table__columnLabel')
                        .appendTo(tr);
                } else {
                    // if column labels are disabled, just create a <th> block sized to accommodate column and row labels.
                    if (columnArrayIndex === 0) {
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
                        return coord[columnArrayIndex];
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
                    .map(function (elem, elemIdx, arr) {
                        var colSpan = (meta.aggregators.length * (colCoords.length / arr.length))
                        var sortingGroupNum = Math.floor(elemIdx / meta.columns[columnArrayIndex].length);
                        var sortingGroupId = 'columns' + '__sortInfo__' + columnArrayIndex + '__sortInfo__' + sortingGroupNum;
                        var th =
                            $('<th>')
                                .addClass('table__colHeader sortableValue')
                                .addClass(sortingGroupId)
                                .data('group', sortingGroupId)
                                .attr({
                                    colspan: colSpan
                                })
                                .mouseenter(function (element) {
                                    var group = $(element.target).data('group');
                                    if (group !== undefined) {
                                        $('.sortableColumn').sortable('option', 'items', '> .' + group);
                                    }
                                })
                                .click(function () {
                                    if (arr.length > 1) {
                                        pivotState.removeHeader('column', columnArrayIndex, elem);
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
        var aggTr = $('<tr>')
            .addClass('sortableColumn')
            .sortable(sortableOptions);
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
        colCoords.map(function (colCoord, colCoordIdx) {
            aggCoords.map(function (aggName) {
                var aggLabel = aggregatorsIsEmpty ? 'COUNT(*)' : aggName;
                var sortingGroupNum = colCoordIdx;
                var sortingGroupId = 'aggregators' + '__sortInfo__' + 0 + '__sortInfo__' + sortingGroupNum;
                $('<th>')
                    .addClass('table__colHeader sortableValue')
                    .addClass(sortingGroupId)
                    .data('group', sortingGroupId)
                    .mouseenter(function (element) {
                        var group = $(element.target).data('group');
                        if (group !== undefined) {
                            $('.sortableColumn').sortable('option', 'items', '> .' + group);
                        }
                    })
                    .click(function () {
                        if (!aggregatorsIsEmpty && aggCoords.length > 1) {
                            pivotState.removeHeader('aggregator', aggCoords.indexOf(aggName), aggLabel);
                            rerenderTable();
                        }
                    })
                    .text(aggLabel)
                    .appendTo(aggTr);
            });
        });
        aggTr.appendTo(thead);
    }

    function makeExpressiveTableBody(allCoords, tbody, data, renderFieldNames, model) {
        var meta = data.meta;
        var results = data.results;

        var rowCoords = allCoords.rowCoords;
        var colCoords = allCoords.colCoords;
        var aggCoords = allCoords.aggCoords;

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
        rowCoords.map(function (rowCoord, rowCoordIdx) {
            var tr = $('<tr>')
                .addClass('sortableColumn')
                .sortable(sortableOptions);

            // If there are no rows (e.g. just pivoting on '*'), insert a label cell.
            if (meta.rows.length === 0) {
                $('<td>')
                    .text('*')
                    .addClass('table__rowHeader')
                    .appendTo(tr);
            } else {
                rowCoord.map(function (rowCoordElem, elemIdx) {
                    var sortingGroupNum = Math.floor(meta.rows[elemIdx].length / rowCoords.length);
                    var sortingGroupId = 'rows' + '__sortInfo__' + elemIdx + '__sortInfo__' + sortingGroupNum;
                    $('<td>')
                        .text(rowCoordElem)
                        .addClass('table__colHeader sortableValue')
                        .addClass(sortingGroupId)
                        .data('group', sortingGroupId)
                        .mouseenter(function (element) {
                            var group = $(element.target).data('group');
                            console.log(sortingGroupNum);
                            console.log(group);
                            if (group !== undefined) {
                                $('.sortableColumn').sortable('option', 'items', '> .' + group);
                            }
                        })
                        .click(function () {
                            var rowIdx = rowCoord.indexOf(rowCoordElem);
                            if (meta.rows[rowIdx].length > 1) {
                                pivotState.removeHeader('row', rowIdx, rowCoordElem);
                                rerenderTable();
                            }
                        })
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
    }

    function makeExpressiveTable(containerElement, data, renderFieldNames, model) {
        var meta = data.meta;
        var results = data.results;
        var allCoords = tutils.allMetaCoordinates(data);

        // DRAW THE TABLE HEADER
        var thead = $('<thead>');
        makeExpressiveTableHead(allCoords, thead, data, renderFieldNames, model);

        // DRAW THE TABLE BODY
        var tbody = $('<tbody>');
        makeExpressiveTableBody(allCoords, tbody, data, renderFieldNames, model);

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
                            pivotState.restoreHeader(shortFieldName, model[modelField].map(function (e) { return e.reducer + "(" + e.name + ")" }).indexOf(elem), elem);
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
                                pivotState.restoreHeader(shortFieldName, excludedIdx, elem);
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