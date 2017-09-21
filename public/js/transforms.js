var pivotState = (function () {
    var pendingTransform;
    var currentTransform;
    var currentResult;

    function getModel() {
        return currentResult.model;
    }

    function getCurrentTransform() {
        return currentTransform;
    }

    function registerResults(results) {
        currentResult = results;
        if (transformIsPending()) {
            promotePendingTransform();
        } else {
            currentTransform = calculateInitialTransform(results.data);
        }
    }

    function transformIsPending() {
        return pendingTransform !== null
            && pendingTransform !== undefined;
    }

    function transformIsEmpty(transformToExamine) {
        // Determine whether the current transform contains semantic information.

        // Guard against nil values.
        if (transformToExamine === null || transformToExamine === undefined) { return true; }

        // get all the arrays of excluded elements.
        var allExclusionArrays = [];
        allExclusionArrays.push(transformToExamine.excludedAggregators);
        transformToExamine.excludedRows.forEach(function (arr) {
            allExclusionArrays.push(arr);
        });
        transformToExamine.excludedColumns.forEach(function (arr) {
            allExclusionArrays.push(arr);
        });

        // then, retain only the arrays which have elements.
        var populatedArrays = allExclusionArrays.filter(function (elem) {
            return elem.length > 0;
        })

        // if there are no arrays with elements, the transform is empty.
        return populatedArrays.length === 0;
    }

    function setPendingTransform(newTransform) {
        pendingTransform = newTransform;
    }

    function promotePendingTransform() {
        currentTransform = pendingTransform;
        pendingTransform = null;
    }

    function calculateInitialTransform(results) {
        var metadata = results.meta;
        var empty = [];
        var initTransforms = {
            excludedColumns: [],
            excludedRows: [],
            excludedAggregators: []
        }
        metadata.columns.forEach(function (val) {
            initTransforms.excludedColumns.push(empty);
        });
        metadata.rows.forEach(function (val) {
            initTransforms.excludedRows.push(empty);
        });
        return initTransforms;
    }

    function onHeaderClick(headerDirection, fieldIndex, clickedElement) {
        var thisTransform = currentTransform;
        //console.log(`HEADER CLICK @ direction ${headerDirection}, container index ${fieldIndex}, element ${clickedElement}`)

        var field;
        var addTransform = false;

        switch (headerDirection) {
            case 'row':
                field = 'excludedRows';
                break;
            case 'column':
                field = 'excludedColumns';
                break;
            case 'aggregator':
                field = 'excludedAggregators';
                break;
        }

        if (field === 'excludedAggregators') {
            if (thisTransform[field].indexOf(clickedElement) === -1) {
                var current = thisTransform[field];
                thisTransform[field] = current.concat([clickedElement]);
            }
        } else {
            if (thisTransform[field][fieldIndex].indexOf(clickedElement) === -1) {
                addTransform = true;
            }

            if (addTransform) {
                var current = thisTransform[field][fieldIndex];
                thisTransform[field][fieldIndex] = current.concat([clickedElement]);
            }
        }
    }

    function restoreElement(fieldShortName, fieldIndex, clickedElement) {
        var thisTransform = currentTransform;

        var field;
        var addTransform = false;

        switch (fieldShortName) {
            case 'row':
                field = 'excludedRows';
                break;
            case 'column':
                field = 'excludedColumns';
                break;
            case 'aggregator':
                field = 'excludedAggregators';
                break;
        }

        if (field === 'excludedAggregators') {
            if (thisTransform[field].indexOf(clickedElement) !== -1) {
                thisTransform[field] = thisTransform[field].filter(function (el) {
                    return el !== clickedElement;
                });
            }
        } else {
            if (thisTransform[field][fieldIndex].indexOf(clickedElement) !== -1) {
                addTransform = true;
            }

            if (addTransform) {
                var current = thisTransform[field][fieldIndex];
                thisTransform[field][fieldIndex] = current.filter(function (el) {
                    return el !== clickedElement;
                });
            }
        }
    }

    function applyTransform() {
        let retResults = JSON.parse(JSON.stringify(currentResult.data));
        retResults.meta.columns = currentResult.data.meta.columns.map(function (columnArr, colIdx) {
            return columnArr.filter(function (columnElement) {
                return currentTransform.excludedColumns[colIdx].indexOf(columnElement) === -1;
            })
        })
        retResults.meta.rows = currentResult.data.meta.rows.map(function (rowArr, rowIdx) {
            return rowArr.filter(function (rowElement) {
                return currentTransform.excludedRows[rowIdx].indexOf(rowElement) === -1;
            })
        })
        retResults.meta.aggregators = currentResult.data.meta.aggregators.filter(function (aggName) {
            return currentTransform.excludedAggregators.indexOf(aggName) === -1;
        })
        return retResults;
    }

    return {
        transformIsPending: transformIsPending,
        applyTransform: applyTransform,
        promotePendingTransform: promotePendingTransform,
        setPendingTransform: setPendingTransform,
        registerResults: registerResults,
        onHeaderClick: onHeaderClick,
        restoreElement: restoreElement,
        getModel: getModel,
        getCurrentTransform: getCurrentTransform,
        transformIsEmpty: transformIsEmpty
    }
})();