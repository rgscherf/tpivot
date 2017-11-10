var tchart = (function () {
    function removeChart() {
        $('#pivotChart').remove();
    }

    function getChartTitle(result, model) {
        // "(STATUS, DUE_DATE) by (TYPE), collected by (COUNT(ID))"
        function makeEntryString(elems) {
            var elemString = elems.map(function (elem) {
                return elem.name;
            }).join(', ');
            return elemString;
        }
        var rowString = model.Rows.length === 0 ? '*' : makeEntryString(model.Rows);
        var colString = model.Columns.length === 0 ? '*' : makeEntryString(model.Columns);
        var aggString = result.meta.aggregators.length === 0
            ? 'COUNT(*)'
            : makeEntryString(result.meta.aggregators.map(function (e) { return { name: e }; }));
        return 'Rows: ' + rowString + '; Columns: ' + colString + '; Collected by: ' + aggString;
    }

    function renderExpChart(model, result, chartType) {
        removeChart();
        var metaCoords = tutils.allMetaCoordinates(result);
        var rowCoords = result.meta.specificRowOrder ? result.meta.specificRowOrder : metaCoords.rowCoords; // accommodating sort-by-value
        var xAxisLabels = [];

        var datums = [];
        // we want each row*agg to be a datum.
        result.meta.aggregators.forEach(function (aggName, aggIdx) {
            rowCoords.forEach(function (rowCoord) {
                var rowData = metaCoords.colCoords.map(function (colCoord) {
                    if (result.results[rowCoord]
                        && result.results[rowCoord][colCoord]
                        && result.results[rowCoord][colCoord][aggName]
                        && result.results[rowCoord][colCoord][aggName].value) {
                        return result.results[rowCoord][colCoord][aggName].value;
                    } else {
                        return 0;
                    }
                });
                var tooltipLabel = rowCoord.join('/');
                var thisXAxisLabel = [aggName, tooltipLabel];
                xAxisLabels.push(thisXAxisLabel);
                var thisDatum = {
                    label: tooltipLabel,
                    data: rowData,
                    backgroundColor: randomColor(),
                    fill: false,
                    yAxisID: aggIdx.toString(),
                    xAxisID: 'x'
                };
                datums.push(thisDatum);
            });
        });

        var yAxes = result.meta.aggregators.map(function (elem, idx) {
            return {
                id: idx.toString(),
                type: 'linear',
                position: 'left',
                scaleLabel: {
                    display: true,
                    labelString: elem
                },
                ticks: {
                    beginAtZero: true
                }
            };
        });

        var canvas = $('<canvas id="pivotChart" width="800" height="550">')

        $(canvas).dialog({
            classes: {
                "ui-dialog": "loadMenu__ui-dialog",
                "ui-dialog-titlebar": "loadMenu__ui-dialog-titlebar",
                "ui-dialog-title": "loadMenu__ui-dialog-title",
                "ui-dialog-titlebar-close": "loadMenu__ui-dialog-close",
                // "ui-dialog-content": "",
            },
            close: function (event, ui) {
                $(this).dialog("destroy");
            },
            resizable: false,
            closeText: "",
            height: 'auto',
            width: 820,
            modal: true,
            title: getChartTitle(result, model),
            closeOnEscape: true
        })
            .css('padding', '10px');

        var chart = new Chart(canvas, {
            type: chartType,
            data: {
                datasets: datums,
            },
            options: {
                tooltips: {
                    mode: 'point',
                    callbacks: {
                        title: function () { }
                    }
                },
                legend: {
                    display: false,
                },
                scales: {
                    yAxes: yAxes,
                    xAxes: [{
                        categoryPercentage: 1.0,
                        barPercentage: 0.8,
                        offset: true,
                        type: 'category',
                        labels: xAxisLabels,
                        id: 'x',
                        gridLines: {
                            display: false,
                            offsetGridLines: true
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 90
                        }
                    }]
                }
            }
        });
        return chart;
    }

    function renderChartDialog(currentResult, chartType) {
        if (['line', 'bar'].indexOf(chartType) === -1) {
            return;
        }
        if (currentResult === undefined) {
            return;
        }

        var model = pivotState.getModel();
        renderExpChart(model, currentResult, chartType);
    }

    return {
        removeChart: removeChart,
        renderChartDialog: renderChartDialog
    };
})();