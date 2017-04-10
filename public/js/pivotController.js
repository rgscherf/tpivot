var tpivot = (function () {
    // Provides a controller interface to PivotUI.
    // when data is loaded, the selection pane calles tpivot.renderpivot
    var render = function (inputData, configModel) {
        // away we go!
        $('#pivotTarget').pivotUI(inputData, configModel, true);
    };

    var makeDataAggregators = function (reducers) {
        // given a list of reducers from the pivot table config, 
        // turn string reducer tag into a reducer fn from
        // pivot UI libary's aggregator template.
        var templates = $.pivotUtilities.aggregatorTemplates;
        var returnAggregators = {};
        reducers.forEach(function (elem) {
            var aggName = elem.reducer + 'Of' + elem.name;
            if (elem.reducer === 'count') {
                returnAggregators[aggName] = function () { return templates[elem.reducer]()(); }
            } else {
                returnAggregators[aggName] = function () { return templates[elem.reducer]()([elem.name]); }
            }
        });
        return returnAggregators;
    };

    var renderPivot = function (data, config) {
        // Public interface for rendering pivot table.
        // data is ALL table data, as array of objects.
        // config is an object in the shape of:
        // {pivot-table-categories: {table-column-names: metadata}
        // (this schema is described in the selection pane controller source.)

        // parse data.reducers into js functions
        if (data.reducers && data.reducers.length > 0) {
            // passing an empty aggregators object causes a runtime error.
            data.config.aggregators = makeDataAggregators(data.reducers);
        }

        // TODO: process filters on js side

        render(data, config)
    };

    return { renderPivot: renderPivot };
})();


