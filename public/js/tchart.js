var tchart = (function () {
    function removeChart() {
        $('#pivotChart').remove();
    }

    function renderExpChart(model, result, chartType) {
        removeChart();
        var metaCoords = tutils.allMetaCoordinates(result);
        var xAxisLabels = metaCoords.colCoords.map(function (elem) {
            return elem.join('/');
        });

        var datums = [];
        // we want each row*agg to be a datum.
        result.meta.aggregators.forEach(function (aggName, aggIdx) {
            metaCoords.rowCoords.forEach(function (rowCoord) {
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
                var rowLabel = model['Values'][aggIdx].reducer + '(' + model['Values'][aggIdx].name + ') of ' + rowCoord.join('/');
                var thisDatum = {
                    label: rowLabel,
                    data: rowData,
                    backgroundColor: randomColor(),
                    fill: false,
                    yAxisID: aggIdx.toString(),
                    xAxisID: 'x'
                };
                datums.push(thisDatum);
            });
        });
        var yAxes = model['Values'].map(function (elem, idx) {
            return {
                id: idx.toString(),
                type: 'linear',
                position: 'left',
                scaleLabel: {
                    display: true,
                    labelString: elem.reducer + '(' + elem.name + ')'
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
            title: tutils.describeModel(model),
            closeOnEscape: true
        })
            .css('padding', '10px');

        var chart = new Chart(canvas, {
            type: chartType,
            data: {
                labels: xAxisLabels,
                datasets: datums
            },
            options: {
                responsive: false,
                tooltips: {
                    mode: 'point'
                },
                legend: {
                    display: false,
                    labels: {
                        display: false
                    }
                },
                scales: {
                    yAxes: yAxes,
                    xAxes: [{
                        id: 'x',
                        ticks: {
                            autoSkip: false
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