var view = (function () {
    var cachedColumnNames = {};

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
            .appendTo('#sortCol-noField');
        var s = $('<i class="fa fa-refresh fa-spin fa-3x fa-fw"></i>').appendTo(d);
    }


    function resetState(selectedTableObject) {
        // Reset DOM state.
        var tableIdentifier = selectedTableObject.owner + selectedTableObject.table;
        removeSortableFieldsFromDOM();
        if (cachedColumnNames[tableIdentifier] !== undefined) {
            addSortableFieldsToDOM(cachedColumnNames[tableIdentifier]);
        } else {
            addFieldLoadingSpinner();
            $.ajax({
                type: "post",
                url: queryColumnURL,
                data: JSON.stringify(selectedTableObject),
                success: function (returnData) {
                    cachedColumnNames[tableIdentifier] = returnData;
                    removeSortableFieldsFromDOM();
                    addSortableFieldsToDOM(returnData);
                },
                error: function (x, stat, err) {
                    console.log("AJAX REQUEST FAILED");
                    console.log(x, stat, err);
                    removeSortableFieldsFromDOM();
                }
            });
        }
    }


    function makeFilterText(model, fieldName) {
        // Stringify a filter object.
        var filterObj = data.getFilter(fieldName);
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
                text = '(' + data.getAggregator(clickInformation.fieldName).reducer + ' of)';
                break;
            case 'filter':
                text = makeFilterText(data.model, clickInformation.fieldName);
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


    function removeDoubleClickedItem(element) {
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
        resetState: resetState,
        makeAdditionalUI: makeAdditionalUI,
        makeClickInformation: makeClickInformation,
        removeDoubleClickedItem: removeDoubleClickedItem,
        removeLoadingSpinner: removeLoadingSpinner,
        addLoadingSpinner: addLoadingSpinner,
        addFieldToBucket: addFieldToBucket,
        removeFieldFromBucket: removeFieldFromBucket
    }
})();