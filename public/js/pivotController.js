var tpivot = (function () {
    // Provides a controller interface to PivotUI.
    // when data is loaded, the selection pane calles tpivot.renderpivot


    ////////////////////////////
    // RENDERING THE PIVOT TABLE
    ////////////////////////////

    var render = function (inputData, configModel) {
        // away we go!
        $('#pivotTarget')
            .pivot(inputData, configModel);
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
            return appliedFilters.filter(function (e) { return e === false }).length === 0; //!appliedFilters.includes(false);
        })
    }


    /////////////////////////
    // GENERATING AGGREGATORS
    /////////////////////////

    var makeSingleAggregator = function (reducerObj) {
        // generate a pair of [aggregator-display-name, aggregator-fn] for use in pivot table generation.
        var templates = $.pivotUtilities.aggregatorTemplates;
        var aggName = reducerObj.reducer[0].toUpperCase() + reducerObj.reducer.substr(1);
        if (reducerObj.reducer === 'count') {
            return [aggName, function () { return templates[reducerObj.reducer]()(); }];
        } else {
            return [aggName, function () { return templates[reducerObj.reducer]()([reducerObj.name]); }];
        }
    };

    var getName = function (obj) { return obj.name };

    var shapePivotConfig = function (model) {
        // make config object for the pivot table, from model
        var configObj = {
            rows: model.Rows.map(getName),
            cols: model.Columns.map(getName),
            hiddenAttributes: model.noField.map(getName),
        };

        // AGGREGATOR PARSING
        // the pivot object just uses the default count() aggregator if there's no
        // aggregators property on the incoming config object, so we'll only worry about
        // creating that property for the user-configured case.
        if (model.Values && model.Values.length > 0) {
            var aggregatorInfoPairs = model.Values.map(function (elem) {
                return makeSingleAggregator(elem);
            });
            configObj.aggregators = aggregatorInfoPairs.map(function (elem) { return elem[1](elem[0]); });
            configObj.aggregatorNames = aggregatorInfoPairs.map(function (elem) { return elem[0]; });
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
        var config = shapePivotConfig(model);
        data = filterRows(data, model);
        render(data, config)
    };

    return { renderPivot: renderPivot };
})();


