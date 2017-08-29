var tchart = (function () {
    var colors = [
        'rgba(255,99,132,1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
    ];

    function removeChart() {
        $('#pivotChart').remove();
    }

    function renderChart(model, resultRows) {
        removeChart();
        var horizLabels = resultRows[0].slice(1);
        var num_labels = model['Rows'].length;
        var datums = resultRows.slice(1).map(function (elem, idx) {
            var label = elem.slice(0, num_labels).map(function (el) { return el === null ? 'NULL' : el; }).join(", ");
            return {
                label: label,
                data: elem.slice(num_labels.length),
                borderColor: colors[idx % colors.length],
                fill: false
            };
        })
        var canvas = $('<canvas id="pivotChart" width="600" height="400">')
            .appendTo($('#pivotTarget'));
        var chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: horizLabels,
                datasets: datums
            },
            options: {
                title: {
                    display: true,
                    text: tutils.describeModel(model)
                },
                responsive: false,
                scales: {
                    xAxes: [{
                        ticks: {
                            autoSkip: false
                        }
                    }]
                }
            }
        });
    }

    return {
        renderChart: renderChart,
        removeChart: removeChart,
    };
})();