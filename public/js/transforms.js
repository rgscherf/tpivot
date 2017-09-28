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

    function buildSelfAssociative(array) {
        var initialNamingMap = {};
        array.forEach(function (elem) {
            initialNamingMap[elem] = elem;
        });
        return initialNamingMap;
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
            },
            naming: {
                rows: [],
                columns: [],
                aggregators: {
                    cannonicalToCurrent: {},
                    currentToCannonical: {}
                }
            }
        }
        metadata.rows.forEach(function (labelArray) {
            initTransforms.excludedRows.push(empty);
            initTransforms.ordering.rows.push(empty);
            initTransforms.naming.rows.push({
                cannonicalToCurrent: buildSelfAssociative(labelArray),
                currentToCannonical: buildSelfAssociative(labelArray)
            });
        });
        metadata.columns.forEach(function (labelArray) {
            initTransforms.excludedColumns.push(empty);
            initTransforms.ordering.columns.push(empty);
            initTransforms.naming.columns.push({
                cannonicalToCurrent: buildSelfAssociative(labelArray),
                currentToCannonical: buildSelfAssociative(labelArray)
            });
        });
        metadata.aggregators.forEach(function (label) {
            initTransforms.naming.aggregators.cannonicalToCurrent[label] = label;
            initTransforms.naming.aggregators.currentToCannonical[label] = label;
        })
        return initTransforms;
    }

    function renameLabel(field, arrayDepth, oldLabel, newLabel) {
        var nameMappings;
        if (field === 'aggregators') {
            nameMappings = currentTransform.naming.aggregators;
        } else {
            nameMappings = currentTransform.naming[field][arrayDepth];
        }

        // first, ensure that newLabel does not match any of the old labels.
        // if so, show an alert and make no further changes.
        var allCurrentKeys = Object.keys(nameMappings.currentToCannonical);
        allCurrentKeys = allCurrentKeys.map(function (elem) { return elem.toLowerCase(); });
        if (allCurrentKeys.indexOf(newLabel.toLowerCase()) !== -1) {
            alert('Sorry, duplicate labels are not allowed.');
            return;
        }

        // first get the cannonical name for this field.
        var cannonical = nameMappings.currentToCannonical[oldLabel];
        // then update the cannonical mapping with the new label.
        nameMappings.cannonicalToCurrent[cannonical] = newLabel;
        // then delete the current->cannonical mapping.
        delete nameMappings.currentToCannonical[oldLabel];
        // then insert the new current->cannical mapping.
        nameMappings.currentToCannonical[newLabel] = cannonical;
    }

    function removeHeader(headerDirection, fieldIndex, label) {
        var thisTransform = currentTransform;

        var field;
        var addTransform = false;
        var currentToCannonical;
        if (headerDirection === 'aggregators') {
            currentToCannonical = currentTransform.naming.aggregators.currentToCannonical;
        } else {
            currentToCannonical = currentTransform.naming[headerDirection][fieldIndex].currentToCannonical;
        }
        var cannonicalLabel = currentToCannonical[label];

        switch (headerDirection) {
            case 'rows':
                field = 'excludedRows';
                break;
            case 'columns':
                field = 'excludedColumns';
                break;
            case 'aggregators':
                field = 'excludedAggregators';
                break;
        }

        if (field === 'excludedAggregators') {
            if (!tutils.isLooseMemberOf(cannonicalLabel, thisTransform[field])) {
                var current = thisTransform[field];
                thisTransform[field] = current.concat([cannonicalLabel]);
            }
        } else {
            if (!tutils.isLooseMemberOf(cannonicalLabel, thisTransform[field][fieldIndex])) {
                addTransform = true;
            }

            if (addTransform) {
                var current = thisTransform[field][fieldIndex];
                thisTransform[field][fieldIndex] = current.concat([cannonicalLabel]);
            }
        }
    }

    function restoreHeader(headerDirection, fieldIndex, label) {
        var thisTransform = currentTransform;

        var field;
        var addTransform = false;
        var currentToCannonical;
        if (headerDirection === 'aggregators') {
            currentToCannonical = currentTransform.naming.aggregators.currentToCannonical;
        } else {
            currentToCannonical = currentTransform.naming[headerDirection][fieldIndex].currentToCannonical;
        }
        var cannonicalLabel = currentToCannonical[label];

        switch (headerDirection) {
            case 'rows':
                field = 'excludedRows';
                break;
            case 'columns':
                field = 'excludedColumns';
                break;
            case 'aggregators':
                field = 'excludedAggregators';
                break;
        }

        if (field === 'excludedAggregators') {
            if (thisTransform[field].indexOf(cannonicalLabel) !== -1) {
                thisTransform[field] = thisTransform[field].filter(function (el) {
                    return el !== cannonicalLabel;
                });
            }
        } else {
            if (thisTransform[field][fieldIndex].indexOf(cannonicalLabel) !== -1) {
                addTransform = true;
            }

            if (addTransform) {
                var current = thisTransform[field][fieldIndex];
                thisTransform[field][fieldIndex] = current.filter(function (el) {
                    return el !== cannonicalLabel;
                });
            }
        }
    }

    function sortField(metaDirection, fieldIndex, newLabels) {
        if (metaDirection === 'aggregators') {
            var cannonicalNewLabels = newLabels.map(function (label) {
                return currentTransform.naming.aggregators.currentToCannonical[label];
            });
            currentTransform.ordering.aggregators = cannonicalNewLabels;
        } else {
            var cannonicalNewLabels = newLabels.map(function (label) {
                return currentTransform.naming[metaDirection][fieldIndex].currentToCannonical[label];
            });
            currentTransform.ordering[metaDirection][fieldIndex] = cannonicalNewLabels;
        }
    }

    function renameSingleField(array, cannonicalToCurrentNames) {
        var retArray = array.map(function (oldElement) {
            return cannonicalToCurrentNames[oldElement];
        })
        return retArray;
    }

    function applyTransformToSingleField(orderingField, excludingField, fieldArr, fieldIdx) {
        // apply transformations to a single transform array.
        // this can be a single row or column field, or the aggregator field.
        var retArray = [];
        var excludingArray;
        var orderingArray;
        var cannonicalToCurrentNames;
        if (orderingField === 'aggregators' && excludingField === 'excludedAggregators') {
            excludingArray = currentTransform['excludedAggregators'];
            orderingArray = currentTransform.ordering.aggregators;
            cannonicalToCurrentNames = currentTransform.naming.aggregators.cannonicalToCurrent;

        } else {
            excludingArray = currentTransform[excludingField][fieldIdx];
            orderingArray = currentTransform.ordering[orderingField][fieldIdx];
            cannonicalToCurrentNames = currentTransform.naming[orderingField][fieldIdx].cannonicalToCurrent;
        }

        // items enter orderingArray as strings, so we do this quick conversion so indexOf will compare correctly.
        // this may cause issues with charting?
        var fieldArrAsStrings = fieldArr.map(function (elem) { return elem.toString(); });
        // add column elements that have been user-specified sorted.
        orderingArray.forEach(function (sortedElement) {
            // ensure the sorted element actually appears in the target array.
            if (tutils.isLooseMemberOf(sortedElement, fieldArrAsStrings)) {
                retArray.push(sortedElement);
            }
        });

        // then add any elements that are not in the user-specified sort.
        let orphanElements = fieldArrAsStrings.filter(function (colArrElem) {
            return !tutils.isLooseMemberOf(colArrElem, orderingArray);
        })
        retArray = retArray.concat(orphanElements);

        // remove any retColArr elements that the user has specified as excluded.
        retArray = retArray.filter(function (retElement) {
            return !tutils.isLooseMemberOf(retElement, excludingArray);
        });

        // replace each element with its current name.
        retArray = renameSingleField(retArray, cannonicalToCurrentNames);

        return retArray;
    }

    function getCannonicalMap(orderingField, fieldIdx) {
        var cannonicalToCurrentNames;
        if (orderingField === 'aggregators') {
            cannonicalToCurrentNames = currentTransform.naming.aggregators.cannonicalToCurrent;
        } else {
            cannonicalToCurrentNames = currentTransform.naming[orderingField][fieldIdx].cannonicalToCurrent;
        }
        return cannonicalToCurrentNames;
    }

    function renameCoordinates() {
        // create new new metadata that ONLY has name mappings applied.
        let oldResultMapping = JSON.parse(JSON.stringify(currentResult.data));
        let newResultMapping = JSON.parse(JSON.stringify(currentResult.data));
        newResultMapping.meta.rows = currentResult.data.meta.rows.map(function (rowArr, rowIdx) {
            var cannonicalMap = getCannonicalMap('rows', rowIdx)
            return renameSingleField(rowArr, cannonicalMap);
        });
        newResultMapping.meta.columns = currentResult.data.meta.columns.map(function (columnArr, colIdx) {
            var cannonicalMap = getCannonicalMap('columns', colIdx)
            return renameSingleField(columnArr, cannonicalMap);
        });
        var aggCannonicalMap = currentTransform.naming.aggregators.cannonicalToCurrent;
        var freshAggs = currentResult.data.meta.aggregators;
        newResultMapping.meta.aggregators = renameSingleField(freshAggs, aggCannonicalMap);

        var oldMetaCoords = tutils.allMetaCoordinates(oldResultMapping);
        var newMetaCoords = tutils.allMetaCoordinates(newResultMapping);

        var newData = {};

        var oldRowCoords = oldMetaCoords.rowCoords;
        var oldColCoords = oldMetaCoords.colCoords;
        var oldAggCoords = oldMetaCoords.aggCoords;

        var newRowCoords = newMetaCoords.rowCoords;
        var newColCoords = newMetaCoords.colCoords;
        var newAggCoords = newMetaCoords.aggCoords;

        var oldResults = oldResultMapping.results
        for (var rowIdx = 0; rowIdx < oldRowCoords.length; rowIdx++) {
            for (var colIdx = 0; colIdx < oldColCoords.length; colIdx++) {
                for (var aggIdx = 0; aggIdx < oldAggCoords.length; aggIdx++) {
                    if (oldResults[oldRowCoords[rowIdx]]
                        && oldResults[oldRowCoords[rowIdx]][oldColCoords[colIdx]]
                        && oldResults[oldRowCoords[rowIdx]][oldColCoords[colIdx]][oldAggCoords[aggIdx]]
                        && oldResults[oldRowCoords[rowIdx]][oldColCoords[colIdx]][oldAggCoords[aggIdx]].value) {

                        var thisRowCoord = newRowCoords[rowIdx];
                        var thisColCoord = newColCoords[colIdx];
                        var thisAggCoord = newAggCoords[aggIdx];
                        if (newData[thisRowCoord] === undefined) {
                            newData[thisRowCoord] = {};
                        }
                        if (newData[thisRowCoord][thisColCoord] === undefined) {
                            newData[thisRowCoord][thisColCoord] = {};
                        }
                        if (newData[thisRowCoord][thisColCoord][thisAggCoord] === undefined) {
                            newData[thisRowCoord][thisColCoord][thisAggCoord] = {};
                        }
                        newData[thisRowCoord][thisColCoord][thisAggCoord] = {
                            value: oldResults[oldRowCoords[rowIdx]][oldColCoords[colIdx]][oldAggCoords[aggIdx]].value
                        };

                    }
                }
            }
        }

        return newData;
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

        var renamedData = renameCoordinates();

        return {
            meta: retResults.meta,
            results: renamedData
        }
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
        transformIsEmpty: transformIsEmpty,
        renameLabel: renameLabel
    }
})();