var tpivot = (function () {

    function isNumber(x) {
        return x === null || x === '' || _.isFinite(Number(x));
    }

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

    function makeExpressiveTableHead(allCoords, thead, data, renderRowColLabels, model, renderRowColTotals) {
        var meta = data.meta;

        var rowCoords = allCoords.rowCoords;
        var colCoords = allCoords.colCoords;
        var aggCoords = allCoords.aggCoords;


        // Drawing column headers
        if (meta.columns.length === 0) {
            var tr = $('<tr>');
            if (renderRowColLabels) {
                // start with N <th> spacers where N is the number of row fields.
                // if N==0, add a <th> spacer for the dummy 'all rows' label.
                meta.rows.forEach(function (_, rowIdx, rowArr) {
                    if (rowIdx < rowArr.length - 1) {
                        $('<th>').appendTo(tr);
                    }
                });
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

            meta.aggregators.forEach(function (_) {
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
                var tr = $('<tr>');
                // render column labels.
                if (renderRowColLabels) {
                    // start with N <th> spacers where N is the number of row fields.
                    // if N==0, add a <th> spacer for the dummy 'all rows' label.
                    meta.rows.forEach(function (_, rowIdx, rowArr) {
                        if (rowIdx < rowArr.length - 1) {
                            $('<th>').appendTo(tr);
                        }
                    });
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
                        var sortingGroupId = 'columns' + '__sortInfo__' + columnArrayIndex + '__sortInfo__' + sortingGroupNum + '__sortInfo__' + elem;
                        var th =
                            $('<th>')
                                .addClass('table__colHeader')
                                .attr({
                                    colspan: colSpan
                                })
                                .mouseenter(function (event) {
                                    twidgets.createTranformWidgetOverlay($(this), meta.columns[columnArrayIndex], sortingGroupId, 'row', rerenderTable);
                                })
                                .mouseleave(function (event) {
                                    twidgets.destroyTransformWidgetOverlay();
                                })
                                .text(elem)
                                .appendTo(tr);
                    });
                tr.appendTo(thead);
            });

            if (renderRowColTotals) {
                aggCoords.forEach(function (aggElem) {
                    $('<th>')
                        .addClass('table__colHeader')
                        .text('Row \u03A3 ' + aggElem)
                        .attr({
                            rowspan: (meta.columns.length + 1)
                        })
                        .appendTo($(thead)
                            .children('tr')
                            .first());
                });
            }
        }

        // drawing agg headers
        var aggTr = $('<tr>');
        var aggregatorsIsEmpty = meta.aggregators.length === 0;
        if (renderRowColLabels) {
            // start with N <th> spacers where N is the number of row fields.
            // if N==0, add a <th> spacer for the dummy 'all rows' label.
            meta.rows.forEach(function (_, rowIdx, rowArr) {
                if (rowIdx < rowArr.length - 1) {
                    $('<th>').appendTo(aggTr);
                }
            });
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
        colCoords.forEach(function (colCoord, colCoordIdx) {
            aggCoords.forEach(function (aggName) {
                var aggLabel = aggregatorsIsEmpty ? 'COUNT(*)' : aggName;
                var sortingGroupNum = colCoordIdx;
                var sortingGroupId = 'aggregators' + '__sortInfo__' + 0 + '__sortInfo__' + sortingGroupNum + '__sortInfo__' + aggName;
                var sortByValueInformation = {
                    colCoord: colCoord,
                    aggCoord: aggName
                }
                $('<th>')
                    .addClass('table__colHeader')
                    .mouseenter(function (event) {
                        twidgets.createAggregatorOverlay($(this), meta.aggregators, sortingGroupId, 'row', rerenderTable, sortByValueInformation);
                    })
                    .mouseleave(function (event) {
                        twidgets.destroyTransformWidgetOverlay();
                    })
                    .text(aggLabel)
                    .appendTo(aggTr);
            });
        });
        aggTr.appendTo(thead);
    }

    function makeExpressiveTableBody(allCoords, tbody, data, renderFieldNames, model, renderRowColTotals) {
        var meta = data.meta;
        var results = data.results;

        var rowCoords = meta.specificRowOrder ? meta.specificRowOrder : allCoords.rowCoords;
        var colCoords = allCoords.colCoords;
        var aggCoords = allCoords.aggCoords;

        // columnTotals holds the running total for each column/aggregate intersection.
        var columnTotals = {};
        colCoords.forEach(function (colCoord) {
            columnTotals[colCoord] = {};
            aggCoords.forEach(function (aggCoord) {
                columnTotals[colCoord][aggCoord] = [];
            });
        });

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
            if (renderRowColTotals && meta.columns.length > 0) {
                emptyLength += meta.aggregators.length;
            }
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
            t.appendTo(tbody);
        }

        // last seen element for rows. Used to calculate rowspan for header elems.
        var lastSeenElement = meta.rows.map(function (rowArr) {
            return '';
        });

        // Each row in the cartesian product of row values is drawn here.
        rowCoords.map(function (rowCoord, rowCoordIdx) {
            // row totals by aggregator.
            var rowTotals = {};
            aggCoords.forEach(function (aggCoord) {
                rowTotals[aggCoord] = [];
            });

            var tr = $('<tr>');

            // If there are no rows (e.g. just pivoting on '*'), insert a label cell.
            if (meta.rows.length === 0) {
                $('<th>')
                    .text('*')
                    .addClass('table__rowHeader')
                    .appendTo(tr);
            } else {
                rowCoord.forEach(function (rowCoordElem, elemIdx) {
                    var sortingGroupNum = Math.floor(rowCoordIdx / meta.rows[elemIdx].length);
                    var sortingGroupId = 'rows' + '__sortInfo__' + elemIdx + '__sortInfo__' + sortingGroupNum + '__sortInfo__' + rowCoordElem;

                    // calculate size and incidence of rowspan attribute
                    var numAdjacentsAtThisDepth = 1;
                    var adjacentElement = '';
                    var allCoordValuesAtThisDepth = rowCoords.map(function (rowCoord) {
                        return rowCoord[elemIdx];
                    });
                    if (!meta.specificRowOrder) { // ignore rowspan shennanigans if we're using specific row ordering.
                        for (var i = 0; i < allCoordValuesAtThisDepth.length; i++) {
                            var elem = allCoordValuesAtThisDepth[i];
                            if (adjacentElement === '') {
                                adjacentElement = elem;
                            } else if (adjacentElement !== elem) {
                                break;
                            } else {
                                numAdjacentsAtThisDepth += 1;
                            }
                        }
                    }
                    if (meta.specificRowOrder || lastSeenElement[elemIdx] !== rowCoordElem) {
                        lastSeenElement[elemIdx] = rowCoordElem;
                        $('<th>')
                            .text(rowCoordElem)
                            .addClass('table__rowHeader')
                            .attr({ 'rowspan': numAdjacentsAtThisDepth })
                            .mouseenter(function (event) {
                                twidgets.createTranformWidgetOverlay($(this), meta.rows[elemIdx], sortingGroupId, 'column', rerenderTable);
                            })
                            .mouseleave(function (event) {
                                twidgets.destroyTransformWidgetOverlay();
                            })
                            .appendTo(tr);
                    }
                });
            }

            // Now draw cell values, iterating through column and agg coords.
            colCoords.forEach(function (colCoord) {
                aggCoords.forEach(function (aggCoord) {
                    var cellValue = '';
                    if (results[rowCoord]
                        && results[rowCoord][colCoord]
                        && results[rowCoord][colCoord][aggCoord]
                        && results[rowCoord][colCoord][aggCoord].value) {
                        cellValue = results[rowCoord][colCoord][aggCoord].value;
                    }
                    // update row totals...
                    rowTotals[aggCoord].push(cellValue);

                    // update column totals...
                    columnTotals[colCoord][aggCoord].push(cellValue);

                    // ...and paint this cell total.
                    var td =
                        $('<td>')
                            .text(cellValue)
                            .appendTo(tr);
                });
            });

            if (renderRowColTotals && meta.columns.length > 0) {
                // draw row total cells
                aggCoords.forEach(function (aggCoord) {
                    var aggValues = rowTotals[aggCoord];
                    var sumCell = $('<td>')
                        .addClass('table__rowColumnTotal');
                    if (_.every(aggValues, isNumber)) {
                        var aggValuesAsNumbers = aggValues.map(function (val) {
                            return Number(val);
                        });
                        var sum = aggValuesAsNumbers.reduce(function (prev, n) {
                            return prev + n;
                        });
                        sumCell.text(sum);
                    } else {
                        sumCell.text('');
                    }
                    sumCell.appendTo(tr);
                });
            }

            // And finally append to the tbody.
            tr.appendTo(tbody);
        });

        // paint column totals and grand total.
        var tr = $('<tr>');
        var grandTotal = {};
        aggCoords.forEach(function (aggCoord) {
            grandTotal[aggCoord] = {
                shouldRender: true,
                total: 0
            };
        });

        var title = $('<th>')
            .addClass('table__rowHeader')
            .attr({ colspan: meta.rows.length })
            .text('Col \u03A3')
        title.appendTo(tr);


        colCoords.forEach(function (colCoord) {
            aggCoords.forEach(function (aggCoord) {
                var td = $('<td>')
                    .addClass('table__rowColumnTotal');
                var colTotal = columnTotals[colCoord][aggCoord];
                if (_.every(colTotal, isNumber)) {
                    var colTotalAsNumbers = colTotal.map(Number);
                    var sum = colTotalAsNumbers.reduce(function (prev, n) {
                        return prev + n;
                    });
                    td.text(sum);
                    var gtForThisAgg = grandTotal[aggCoord];
                    if (gtForThisAgg.shouldRender) {
                        gtForThisAgg.total += sum;
                    }
                } else {
                    td.text('');
                    grandTotal[aggCoord].shouldRender = false;
                }
                td.appendTo(tr);
            });
        });

        if (meta.columns.length > 0) {
            // paint grand total
            aggCoords.forEach(function (aggCoord) {
                var td = $('<td>')
                    .addClass('table__rowColumnTotal');
                var gtForThisAgg = grandTotal[aggCoord];
                if (gtForThisAgg.shouldRender) {
                    td.text(gtForThisAgg.total);
                } else {
                    td.text('');
                }
                td.appendTo(tr);
            });
        }
        tr.appendTo(tbody);
    }

    function makeExpressiveTable(containerElement, data, model, renderRowColLabels, renderRowColTotals) {
        var meta = data.meta;
        var results = data.results;
        var allCoords = tutils.allMetaCoordinates(data);

        // DRAW THE TABLE HEADER
        var thead = $('<thead>');
        makeExpressiveTableHead(allCoords, thead, data, renderRowColLabels, model, renderRowColTotals);

        // DRAW THE TABLE BODY
        var tbody = $('<tbody>');
        makeExpressiveTableBody(allCoords, tbody, data, renderRowColLabels, model, renderRowColTotals);

        var table = $('<table>').addClass('table table-bordered table-condensed');
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
                    shortFieldName = 'rows';
                    break;
                case 'excludedColumns':
                    modelField = 'Columns';
                    shortFieldName = 'columns';
                    break;
                case 'excludedAggregators':
                    modelField = 'Values';
                    shortFieldName = 'aggregators';
                    break;

            }

            if (transformField === 'excludedAggregators') {
                var cannonicalToCurrent = transform.naming.aggregators.cannonicalToCurrent;
                var arrDiv = $('<tr>');
                $('<th>')
                    .appendTo(arrDiv);
                transform[transformField].forEach(function (elem) {
                    var currentName = cannonicalToCurrent[elem]
                    $('<td>')
                        .text(currentName)
                        .css({ 'padding-left': '10px', 'padding-right': '10px' })
                        .click(function () {
                            pivotState.restoreHeader(shortFieldName, model[modelField].map(function (e) { return e.reducer + "(" + e.name + ")" }).indexOf(elem), currentName);
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
                        var cannonicalToCurrent = transform.naming[shortFieldName][excludedIdx].cannonicalToCurrent;
                        var currentName = cannonicalToCurrent[elem];
                        $('<td>')
                            .text(currentName)
                            .css({ 'padding-left': '10px', 'padding-right': '10px' })
                            .click(function () {
                                pivotState.restoreHeader(shortFieldName, excludedIdx, currentName);
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
        var renderRowColTotals = true;
        var renderRowColLabels = true;
        makeExpressiveTable(container, calculatedResults, currentModel, renderRowColLabels, renderRowColTotals);
    }


    function renderPivot(pivotData) {
        if (pivotData.results === false || !pivotData.data) { return; }

        removePivot();
        var container = makePivotContainer(pivotData.model);

        if (pivotData.error) {
            makeErrorPanel(container, pivotData);
            return;
        }

        pivotState.registerResults(pivotData);
        var calculatedTable = pivotState.applyTransform();
        var renderRowColTotals = true;
        var renderRowColLabels = true;
        makeExpressiveTable(container, calculatedTable, pivotData.model, renderRowColLabels, renderRowColTotals);
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