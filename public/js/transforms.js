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
            excludedAggregators: [],
            ordering: {
                rows: [],
                columns: [],
                aggregators: [],
            }
        }
        metadata.rows.forEach(function (val) {
            initTransforms.excludedRows.push(empty);
            initTransforms.ordering.rows.push(empty);
        });
        metadata.columns.forEach(function (val) {
            initTransforms.excludedColumns.push(empty);
            initTransforms.ordering.columns.push(empty);
        });
        return initTransforms;
    }

    function removeHeader(headerDirection, fieldIndex, clickedElement) {
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

    function restoreHeader(fieldShortName, fieldIndex, clickedElement) {
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

    function sortField(metaDirection, fieldIndex, newLabels) {
        if (metaDirection === 'aggregators') {
            currentTransform.ordering.aggregators = newLabels;
        } else {
            currentTransform.ordering[metaDirection][fieldIndex] = newLabels;
        }
    }

    function applyTransformToSingleField(orderingField, excludingField, fieldArr, fieldIdx) {
        // apply transformations to a single transform array.
        // this can be a single row or column field, or the aggregator field.
        var retArray = [];
        var orderingArray;
        var excludingArray;
        if (orderingField === 'aggregators' && excludingField === 'excludedAggregators') {
            orderingArray = currentTransform.ordering['aggregators'];
            excludingArray = currentTransform['excludedAggregators'];

        } else {
            orderingArray = currentTransform.ordering[orderingField][fieldIdx];
            excludingArray = currentTransform[excludingField][fieldIdx];
        }

        // items enter orderingArray as strings, so we do this quick conversion so indexOf will compare correctly.
        // this may cause issues with charting?
        var fieldArrAsStrings = fieldArr.map(function (elem) { return elem.toString(); });
        // add column elements that have been user-specified sorted.
        orderingArray.forEach(function (sortedElement) {
            // ensure the sorted element actually appears in the target array.
            if (fieldArrAsStrings.indexOf(sortedElement) !== -1) {
                retArray.push(sortedElement);
            }
        });

        // then add any elements that are not in the user-specified sort.
        let orphanElements = fieldArrAsStrings.filter(function (colArrElem) {
            return orderingArray.indexOf(colArrElem) === -1;
        })
        retArray = retArray.concat(orphanElements);

        // remove any retColArr elements that the user has specified as excluded.
        retArray = retArray.filter(function (retElement) {
            return excludingArray.indexOf(retElement) === -1;
        });
        return retArray;
    }

    function applyTransform() {
        let retResults = JSON.parse(JSON.stringify(currentResult.data));

        retResults.meta.rows = currentResult.data.meta.rows.map(function (rowArr, rowIdx) {
            return applyTransformToSingleField('rows', 'excludedRows', rowArr, rowIdx);
        });
        retResults.meta.columns = currentResult.data.meta.columns.map(function (columnArr, colIdx) {
            return applyTransformToSingleField('columns', 'excludedColumns', columnArr, colIdx);
        });
        var dataAggs = currentResult.data.meta.aggregators;
        retResults.meta.aggregators = applyTransformToSingleField('aggregators', 'excludedAggregators', dataAggs);
        return retResults;
    }

    return {
        transformIsPending: transformIsPending,
        applyTransform: applyTransform,
        promotePendingTransform: promotePendingTransform,
        setPendingTransform: setPendingTransform,
        registerResults: registerResults,
        removeHeader: removeHeader,
        restoreHeader: restoreHeader,
        sortField: sortField,
        getModel: getModel,
        getCurrentTransform: getCurrentTransform,
        transformIsEmpty: transformIsEmpty
    }
})();