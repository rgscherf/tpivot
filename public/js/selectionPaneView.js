var view = (function () {

    function removeSortableFieldsFromDOM() {
        // Remove all sortable field elements.
        $('.fieldList__item').remove();
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
        var icon = $('<i class="fa fa-check" aria-hidden="true"></i>')
            .appendTo(indicator);
    }


    function removeFieldFromBucket(fieldName) {
        // When a given field is removed from a sorting bucket, also remove its selection indicator in the field list.
        var indicator = findBucketIndicatorOfField(fieldName);
        if (!indicator) { return; }
        indicator.children().remove();
    }


    function addSortableFieldsToDOM(fieldsToAdd) {
        // Given an array of fields, construct a container element for each.
        fieldsToAdd.forEach(function (elem) {
            var field = constructSortableField(elem);
            field.appendTo('#sortCol-noField');
        });
    }


    function resetState(selectedTableObject) {
        // Reset DOM state.
        removeSortableFieldsFromDOM();
        addSortableFieldsToDOM(selectedTableObject.headers);
    }


    function makeFilterText(model, fieldName) {
        // Stringify a filter object.
        var filterObj = data.getFilter(model, fieldName);
        var is = filterObj.filterExistence ? "is" : "is not";
        return "(" + is + " " + filterObj.filterOp + " " + filterObj.filterVal + ")";
    }


    function makeAdditionalUI(model, clickInformation) {
        // Construct filter/reducer guide text and add it to the DOM.
        clickInformation.clicked.find('.additionalUI').remove();
        var text = '';
        switch (clickInformation.contextType) {
            case 'aggregator':
                text = '(' + data.getAggregator(model, clickInformation.fieldName).reducer + ' of)';
                break;
            case 'filter':
                text = makeFilterText(model, clickInformation.fieldName);
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


    function makeClickInformation(model, fieldName, bucket, appendElement) {
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
        $('#loadingSpinner').remove();
    }

    function addLoadingSpinner() {
        // Add loading spinner element to DOM.
        removeLoadingSpinner();
        var d = $('<div>')
            .addClass('queryBuilder--itemMargin')
            .addClass('queryBuilder__spinner')
            .attr('id', 'loadingSpinner')
            .appendTo('#loadingContainer');
        var content = $('<i class="fa fa-refresh fa-spin fa-2x fa-fw"></i><span class="sr-only">Loading...</span>')
            .appendTo(d);
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