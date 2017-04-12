var tpivot = (function () {
    // Provides a controller interface to PivotUI.
    // when data is loaded, the selection pane calles tpivot.renderpivot


    ////////////////////////////
    // RENDERING THE PIVOT TABLE
    ////////////////////////////

    var render = function (inputData, configModel) {
        // away we go!
        //$('#pivotTarget').pivotUI(inputData, configModel, true);
        $('#pivotTarget')
            .pivot(inputData, configModel)
            .addClass('smallPadding');
    };


    ///////////////////////
    // FILTERING TABLE ROWS
    ///////////////////////

    var filterPredicates = {
        "less than": function (a, b) { return a < b; },
        "equal to": function (a, b) { return a == b; },
        "greater than": function (a, b) { return a > b; },
        "including": function (a, b) {
            if (a && typeof a === 'string' && b && typeof b === 'string') {
                return a.toLowerCase().includes(b.toLowerCase());
            } else {
                return false;
            }
        }
    };

    var makeFilters = function (filters) {
        // Get an array of filters based on model's filter objects.
        // For example, given the filter object
        // {name: 'Age', filterOp: 'lt', filterVal: 60, filterExistence: true}...
        return filters.map(function (filterObj) {
            var rowField = filterObj.name; // Age
            var comparator = filterObj.filterVal; // 60
            var returnPositiveCase = filterObj.filterExistence; // true
            var comparison = filterPredicates[filterObj.filterOp]; // (a) -> a < 60
            return function (tableRow) {
                // return a filter predicate that takes a table row
                // and runs the supplied comparison function
                // (with #comparator as the other argument)
                var incomingValue = tableRow[rowField];
                var positiveReturn = comparison(incomingValue, comparator);
                return returnPositiveCase ? positiveReturn : !positiveReturn;
            };
        });
    };

    var filterRows = function (tableRows, model) {
        var filters = makeFilters(model.Filters);
        return tableRows.filter(function (elem) {
            var appliedFilters = filters.map(function (f) {
                return f(elem);
            });
            // returns true if none of the filter fns return false.
            return !appliedFilters.includes(false);
        })
    }


    /////////////////////////
    // GENERATING AGGREGATORS
    /////////////////////////

    var makeSingleAggregator = function (reducerObj) {
        // generate a pair of [aggregator-name, aggregator-fn] for use in pivot table generation.
        // returning a pair makes this function useful for generating a map of aggregators, or just a single one.
        var templates = $.pivotUtilities.aggregatorTemplates;
        var aggName = reducerObj.reducer + 'Of' + reducerObj.name;
        if (reducerObj.reducer === 'count') {
            return [aggName, function () { return templates[reducerObj.reducer]()(); }];
        } else {
            return [aggName, function () { return templates[reducerObj.reducer]()([reducerObj.name]); }];
        }
    };

    var makeDataAggregators = function (reducers) {
        // given a list of reducers from the pivot table config, 
        // turn string reducer tag into a reducer fn from
        // pivot UI libary's aggregator template.
        var returnAggregators = {};
        reducers.forEach(function (elem) {
            var aggArray = makeSingleAggregator(elem);
            returnAggregators[aggArray[0]] = aggArray[1];
        });
        return returnAggregators;
    };


    var getName = function (obj) { return obj.name };

    var shapePivotConfig = function (model, renderUITable) {
        var renderUI = typeof renderUITable === 'undefined' ? true : renderUITable;

        // make config object for the pivot table, from model
        var configObj = {
            rows: model.Rows.map(getName),
            cols: model.Columns.map(getName),
            hiddenAttributes: model.noField.map(getName),
        };

        // aggregator handling
        if (model.Values && model.Values.length > 0) {
            if (renderUI) {
                configObj.aggregators = makeDataAggregators(model.Values);
            } else {
                configObj.aggregators = model.Values.map(function (elem) {
                    var agg = makeSingleAggregator(elem);
                    return agg[1](agg[0]);
                })
                // var aggregator = makeSingleAggregator(model.Values[0]);
                // configObj.aggregatorName = aggregator[0];
                // configObj.aggregator = aggregator[1](model.Values[0].name);
            }
        }

        return configObj;
    }


    /////////////
    // PUBLIC API
    /////////////

    var renderPivot = function (data, model) {
        // Public interface for rendering pivot table.
        // data is ALL table data, as array of objects.
        // config is an object in the shape of:
        // {pivot-table-categories: {table-column-names: metadata}
        // (this schema is described in the selection pane controller source.)
        var config = shapePivotConfig(model, false);
        data = filterRows(data, model);
        render(data, config)
    };

    return { renderPivot: renderPivot };
})();


