var tchart = (function () {
    // deprecated. these are the original bar colors for chart.js
    var colorPalette = [
        'rgba(255,99,132,1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
    ];

    // first element of each array is the 'base' color for a bar/line. further color are analagous, 
    // used for additional values on same cell.
    var colors = [
        ['rgba(255,99,132,1)', 'rgba(255, 125, 86, 1)', 'rgba(232, 91, 78, 1)', 'rgba(232, 78, 188, 1)', 'rgba(236, 86, 255, 1)'],
        ['rgba(54, 162, 235, 1)', 'rgba(44, 58, 246, 1)', 'rgba(38, 96, 212, 1)', 'rgba(38, 188, 212, 1)', 'rgba(44, 246, 219, 1)'],
        ['rgba(255, 206, 86, 1)', 'rgba(255, 239, 73, 1)', 'rgba(232, 201, 67, 1)', 'rgba(232, 167, 67, 1)', 'rgba(255, 160, 73, 1)'],
        ['rgba(75, 192, 192, 1)', 'rgba(70, 134, 205, 1)', 'rgba(73, 178, 215, 1)', 'rgba(73, 215, 175, 1)', 'rgba(70, 205, 128, 1)'],
        ['rgba(153, 102, 255, 1)', 'rgba(235, 89, 255, 1)', 'rgba(173, 81, 232, 1)', 'rgba(90, 81, 232, 1)', 'rgba(89, 123, 255, 1)'],
        ['rgba(255, 159, 64, 1)', 'rgba(255, 199, 51, 1)', 'rgba(232, 162, 47, 1)', 'rgba(232, 112, 47, 1)', 'rgba(255, 93, 51, 1)'],
    ]

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
                    backgroundColor: 'rgba(100,100,100)',
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

        var canvas = $('<canvas id="pivotChart" width="600" height="400">')

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
            width: 620,
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
                    position: 'bottom',
                    labels: {
                        boxWidth: 20
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