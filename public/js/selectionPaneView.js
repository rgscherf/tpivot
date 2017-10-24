var view = (function () {
    var cachedColumnNames = {};
    var dbCache = {
        dbTables: {},
        tableColumnNames: {},
        cachedColumnNames: {},
        currentDb: '',
        currentTable: {}
    };


    function removeSortableFieldsFromDOM() {
        // Remove all sortable field elements.
        $('.fieldList__item').remove();
        $('.queryBuilder__fieldListItemContainer').remove();
        $('#sortCol-noField').children().remove();
    }


    function makeDraggableField(fieldName) {
        // Create a container element for a sortable field.
        var fieldNameSpaceSafe = fieldName.split(' ').join('-');
        var field = $('<div>')
            .addClass('fieldList__item draggableItem field')
            .attr('id', 'sortField-' + fieldNameSpaceSafe)
            .text(fieldName)
            .disableSelection()
            .draggable({
                helper: "clone",
                revert: "invalid"
            });
        return field;
    }


    function makeBucketIndicator() {
        var indicator = $('<div>')
            .addClass('queryBuilder__bucketIndicator');
        return indicator;
    }


    function constructSortableField(fieldName) {
        // Make a single entry in the field list.
        // Entries are composed of two elements: 
        // - a div for the selection indicator
        // - a div for the field's name
        var container = $('<div>')
            .addClass('queryBuilder__fieldListItemContainer');
        var draggableField = makeDraggableField(fieldName);
        var indicator = makeBucketIndicator();
        container.append(indicator, draggableField);
        return container;
    }


    function findBucketIndicatorOfField(fieldName) {
        var matchedElem = $('#sortCol-noField .fieldList__item')
            .filter(function (idx, elem) {
                return utils.textOf($(elem)) === fieldName;
            })
            .first();
        if (!matchedElem) { return; }
        var indicator = $(matchedElem)
            .parent()
            .find('.queryBuilder__bucketIndicator')
            .first();
        return $(indicator);
    }


    function addFieldToBucket(fieldName) {
        // When a given field is added to a sorting bucket, add a selection indicator to its entry in the field list.
        var indicator = findBucketIndicatorOfField(fieldName);
        if (!indicator) { return; }
        if (indicator.children().length == 0) {
            var icon = $('<i class="fa fa-check" aria-hidden="true"></i>')
                .appendTo(indicator);
        }
    }


    function removeFieldFromBucket(fieldName) {
        // When a given field is removed from a sorting bucket, also remove its selection indicator in the field list.
        var indicator = findBucketIndicatorOfField(fieldName);
        if (!indicator) { return; }
        var occurrencesOfFieldInBuckets = $('.fieldList__item--inBucket')
            .filter(function (idx, elem) {
                return utils.textOf($(elem)) === fieldName;
            })
            .length;
        if (occurrencesOfFieldInBuckets === 0) {
            indicator.children().remove();
        }
    }


    function addSortableFieldsToDOM(fieldsToAdd) {
        // Given an array of fields, construct a container element for each.
        fieldsToAdd.forEach(function (elem) {
            var field = constructSortableField(elem);
            field.appendTo('#sortCol-noField');
        });
    }

    function addFieldLoadingSpinner() {
        var d = $('<div>')
            .css({
                'width': '100%',
                'height': '150px',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center'
            })
            .attr('id', 'fieldLoadingSpinner')
            .appendTo('#sortCol-noField');
        var s = $('<i class="fa fa-refresh fa-spin fa-3x fa-fw"></i>').appendTo(d);
    }

    function removeFieldLoadingSpinner() {
        $('#fieldLoadingSpinner').remove();
    }


    function initNewDb(dbName, optionalTableIdentifier) {
        // with a db name guaranteed to be in the tables cache, populate the table selector.
        // optionally take a table identifier that will be the value of the selector element.
        // use the optional value when you know which element the user wants to select, e.g. when
        // loading a previously-saved model.
        var dbTables = dbCache.dbTables[dbName];
        if (dbTables === undefined) {
            debugger;
        }
        var tableSelect = $('#tableSelector');
        dbTables.forEach(function (tableObj) {
            var tableIdentifier = tableObj.owner + "." + tableObj.table;
            // ensure the table object is cached.
            if (dbCache.tableColumnNames[dbName] === undefined) {
                dbCache.tableColumnNames[dbName] = {};
            }
            dbCache.tableColumnNames[dbName][tableIdentifier] = tableObj;
            var selectElement =
                $('<option>')
                    .val(tableIdentifier)
                    .text(tableIdentifier)
                    .appendTo(tableSelect);
        });
        if (optionalTableIdentifier !== undefined) {
            $('#tableSelector').val(optionalTableIdentifier);
        }
    }

    function retrieveTablesFor(dbName, optionalTableIdentifier) {
        // if the tables for a given database were not found in cache
        // retrieve them from the server.
        $.ajax({
            type: "post",
            url: getDbTables,
            data: JSON.stringify(dbName),
            success: function (returnData) {
                dbCache.dbTables[dbName] = returnData;
                initNewDb(dbName, optionalTableIdentifier);
            },
            error: function (x, stat, err) {
                console.log("AJAX REQUEST FAILED");
                console.log(x, stat, err);
                removeLoadingSpinner();
                tpivot.renderTimeout();
            }
        });
    }

    function switchToNewDb(dbName, optionalTableIdentifier) {
        // When the user selects a new database to pull information from,
        // populate the data source selector with tables from that database.
        $('#tableSelector').children().remove();
        dbCache.currentDb = dbName;
        if (dbCache.dbTables[dbName] === undefined) {
            retrieveTablesFor(dbName, optionalTableIdentifier);
        } else {
            initNewDb(dbName, optionalTableIdentifier);
        }
        removeSortableFieldsFromDOM();
    }

    function switchToNewTable(tableIdentifier) {
        // Reset DOM state.
        var idElements = tableIdentifier.split('.');
        var tableObj = {
            db: dbCache.currentDb,
            owner: idElements[0],
            table: idElements[1]
        }
        dbCache.currentTable = tableObj;
        removeSortableFieldsFromDOM();
        if (dbCache.cachedColumnNames[dbCache.currentDb] === undefined) {
            dbCache.cachedColumnNames[dbCache.currentDb] = {};
        } if (dbCache.cachedColumnNames[dbCache.currentDb][tableIdentifier] === undefined) {
            addFieldLoadingSpinner();
            $.ajax({
                type: "post",
                url: queryColumnURL,
                data: JSON.stringify(tableObj),
                success: function (returnData) {
                    dbCache.cachedColumnNames[dbCache.currentDb][tableIdentifier] = returnData;
                    removeFieldLoadingSpinner();
                    addSortableFieldsToDOM(returnData);
                },
                error: function (x, stat, err) {
                    console.log("AJAX REQUEST FAILED");
                    console.log(x, stat, err);
                    removeFieldLoadingSpinner();
                }
            });

        }
        else {
            dbCache.currentTable = tableObj;
            addSortableFieldsToDOM(dbCache.cachedColumnNames[dbCache.currentDb][tableIdentifier]);
        }
    }

    function getCurrentDbInfo() {
        return {
            db: dbCache.currentDb,
            owner: dbCache.currentTable.owner,
            table: dbCache.currentTable.table,
        }
    }


    function makeFilterText(filterIdx) {
        // Stringify a filter object.
        var filterObj = data.getFilter(filterIdx);
        if (filterObj.filterVal === '') { return '[right-click to build]'; }

        var is = filterObj.filterExistence ? "IS" : "IS NOT";
        return is + " " + filterObj.filterOp + " " + filterObj.filterVal;
    }


    function makeAdditionalUI(clickInformation) {
        // Construct filter/reducer guide text and add it to the DOM.
        clickInformation.clicked.find('.additionalUI').remove();
        var text = '';
        switch (clickInformation.contextType) {
            case 'aggregator':
                text = '(' + data.getAggregator(clickInformation.clicked.index()).reducer + ' of)';
                break;
            case 'filter':
                text = makeFilterText(clickInformation.clicked.index());
                break;
            default:
                break;
        }
        if (text !== '') {
            $('<span>')
                .addClass('additionalUI')
                .addClass('metadataAnnotation')
                .text(text)
                .appendTo(clickInformation.clicked)
        }
    }


    function makeClickInformation(fieldName, bucket, appendElement) {
        // Populate an object on field instantiation that can be passed to makeAdditionUI. 
        // This way, filter/value fields can show defauly guide text.
        if (bucket != 'Values' && bucket != 'Filters') { return null; }
        return {
            contextType: bucket == 'Values' ? 'aggregator' : 'filter',
            fieldName: fieldName,
            clicked: appendElement
        }
    }


    function removeFieldDomElement(element) {
        // Remove an item from the DOM when it is double-clicked.
        var itemClass = 'fieldList__item--inBucket';
        if (element.hasClass(itemClass)) {
            element.remove();
        } else {
            element.closest('.' + itemClass).remove();
        }
    }

    function removeLoadingSpinner() {
        // Remove loading spinner element from DOM.
        $('#loadingSpinner')
            .children()
            .remove();
        $('#loadingSpinner')
            .removeClass('queryBuilder__spinner')
            .append('<i class="fa fa-2x fa-refresh" aria-hidden="true"></i>');
        $('#loadingLabel').text('Awaiting Input');
        $('#stopLoadLabel').text('Nothing Pending');
    }

    function addLoadingSpinner() {
        // Add loading spinner element to DOM.
        $('#loadingSpinner')
            .children()
            .remove();
        $('#loadingSpinner')
            .addClass('queryBuilder__spinner')
            .append('<i class="fa fa-2x fa-refresh fa-spin" aria-hidden="true"></i>');
        $('#loadingLabel').text('Getting Data');
        $('#stopLoadLabel').text('Cancel Pending');
    }


    return {
        getCurrentDbInfo: getCurrentDbInfo,
        switchToNewDb: switchToNewDb,
        switchToNewTable: switchToNewTable,
        makeAdditionalUI: makeAdditionalUI,
        makeClickInformation: makeClickInformation,
        removeFieldDomElement: removeFieldDomElement,
        removeLoadingSpinner: removeLoadingSpinner,
        addLoadingSpinner: addLoadingSpinner,
        addFieldToBucket: addFieldToBucket,
        removeFieldFromBucket: removeFieldFromBucket
    }
})();