var contextMenus = (function () {
    // Functions for handling context menus.

    ///////////////////////////
    // TEMPLATE HTML COMPONENTS
    ///////////////////////////

    // HTML for the aggregator selection menu.
    var aggregatorSelection = ['<div class="context context__sideby" data-contexttype="aggregator">',
        '<div class="context__background">',
        '<div class="context__annotation" style="opacity:.8;margin-bottom:3px;">Summarize by</div>',
        '<div class="context__aggregatorItem" data-aggregator="listagg">List unique</div>',
        '<div class="context__aggregatorItem" data-aggregator="count">Count</div>',
        '<div class="context__aggregatorItem" data-aggregator="sum">Sum</div>',
        '<div class="context__aggregatorItem" data-aggregator="avg">Average</div>',
        '<div class="context__aggregatorItem" data-aggregator="min">Min</div>',
        '<div class="context__aggregatorItem" data-aggregator="max">Max</div>',
        '<div class="context__aggregatorItem" data-aggregator="stddev">Std. Dev.</div>',
        '<div class="context__aggregatorItem" data-aggregator="variance">Variance</div>',
        // '</div>',
        // '<div class="context__background">',
        // '<div class="context__annotation" style="opacity:.8;margin-bottom:3px;">Display as</div>',
        // '<div class="context__aggregatorItem" data-displayas="raw">Raw value</div>',
        // '<div class="context__aggregatorItem" data-displayas="row">% row total</div>',
        // '<div class="context__aggregatorItem" data-displayas="col">% column total</div>',
        // '<div class="context__aggregatorItem" data-displayas="total">% grand total</div>',
        '</div>',
        '</div >'].join("\n");

    // HTML for the filter context menu.
    // If you are adding a new value here, you MUST ADD a 
    // matching keyed predicate in tpivot.filterPredicates() 
    var filterSelection = [
        '<div class="context_filter context context__background" data-contexttype="filter">',
        '<div class="context__filterInput" id="filterFieldNameEntry">',
        'Show rows where $field</div>',
        '<div class="context__filterInput">',
        '<span><select id="filterContextExistence">',
        '<option>is</option>',
        '<option>is not</option>',
        '</select></span>',
        '<span>',
        '<select id="filterContextOp">',
        '<option>less than</option>',
        '<option>equal to</option>',
        '<option>greater than</option>',
        '<option>like</option>',
        '</select>',
        '</span>',
        '<span>',
        '<input type="text" maxlength="18" id="filterContextValue">',
        '</span>',
        '</div>',
        '<div class="context__filterInput" style="justify-content:flex-end;">',
        '<button id="filterContextCancel">Cancel</button>',
        '<button id="filterContextApply">Apply</button>',
        '</div>',
        '</div>'].join("\n");


    ///////////////////////////////////////////////////
    // 'POP' CONTEXT MENUS TO INITIALIZE AND ADD TO DOM
    ///////////////////////////////////////////////////

    var makeContextHtml = function (htmlString, event, elementToAppend) {
        // Create the html for a new filter/aggregator context menu and append it to the proper element.
        var contextMenu = $(htmlString);

        // this append is important--we find the field name later by
        // calling closest('.sortableItem').attr('id')
        contextMenu
            .appendTo(elementToAppend)
            .show(200);

        // context menu should appear with mouse click position at lower left of the box.
        var contextHeight = parseInt(contextMenu.css('height'), 10);
        var contextTopPosition = event.pageY - contextHeight;
        contextMenu.css({ top: contextTopPosition + 'px', left: event.pageX + 'px' });
    }

    var popAggregatorMenu = function (model, event, clickedSortItem) {
        makeContextHtml(aggregatorSelection, event, clickedSortItem);
        // highlight the current aggregator function
        var fieldName = utils.textOf(clickedSortItem);
        var reducerObj = data.getAggregator(model, fieldName);
        var currentlySelectedAggregator = reducerObj.reducer;
        var currentlySelectedDisplayAs = reducerObj.displayAs;
        $('.context__aggregatorItem')
            .filter("[data-aggregator='" + currentlySelectedAggregator + "']")
            .addClass('context__aggregatorItem--selected');
        // display-as fields are deprecated for now. 
        $('.context__aggregatorItem')
            .filter("[data-displayas='" + currentlySelectedDisplayAs + "']")
            .addClass('context__aggregatorItem--selected');
    }

    var popFilterMenu = function (model, event, clickedSortItem) {
        makeContextHtml(filterSelection, event, clickedSortItem);
        var fieldName = utils.textOf(clickedSortItem);
        var filter = data.getFilter(model, fieldName);
        $('#filterFieldNameEntry').text("Show rows where " + fieldName);

        var isOrIsNot = filter.filterExistence ? 'is' : 'is not';
        $('#filterContextExistence').val(isOrIsNot);
        $('#filterContextValue').val(filter.filterVal);
        $('#filterContextOp').val(filter.filterOp);
    }

    var popMenu = function (model, event) {
        // Open the context menu. 
        // This event only fires on .sortableItem elements.
        // model is NOT mutated here; only read for initial element state.
        if (!($(event.target).closest('.fieldList__item--inBucket').length > 0)) {
            return;
        }
        event.preventDefault();
        var clickedSortItem = $(event.target).closest('.fieldList__item--inBucket');
        var clickedSortList = $(event.target).closest('.sortingBucket__fieldContainer').data('bucket');

        switch (clickedSortList) {
            // set base HTML for the new element
            case 'Values':
                popAggregatorMenu(model, event, clickedSortItem);
                break;
            case 'Filters':
                popFilterMenu(model, event, clickedSortItem);
                break;
            default: return;
        }
    };


    ////////////////////
    // HIDE CONTEXT MENU
    ////////////////////

    var hideMenu = function (event) {
        if (!($(event.target).parents('.context').length > 0)) {
            $('.context').remove();
        }
    }


    //////////////////////////////////////////////////////
    // GET INFORMATION WHEN A CONTEXT IS CLICKED.
    // SENT BACK TO SELECTION PANE TO MODIFY MODEL AND DOM
    //////////////////////////////////////////////////////

    var getAggregatorClickInformation = function (event) {
        var target = $(event.target);
        var clickedField = target.closest('.fieldList__item--inBucket')
        return {
            contextType: "aggregator",
            clicked: clickedField,
            fieldName: utils.textOf(clickedField),
            selectedReducer: target.data("aggregator"),
            // display-as fields are deprecated for now. 
            selectedDisplayAs: target.data("displayas")
        }
    }

    //////////////////////////////////////////////
    // DEPRECATED UNTIL FILTERS ARE RE-IMPLEMENTED
    var tryToApplyFilter = function (event) {
        // relevant id's in the filter context box, and the
        // filter object fields they correspond to (if applicable)
        // filterContextExistence - filterObj.filterExistence
        // filterContextValue - filterObj.filterVal
        // filterContextOp - filterObj.filterOp
        // filterContextCancel - NA
        // filterContextApply - NA
        var clickedField = $(event.target).closest('.fieldList__item--inBucket');
        var fieldName = utils.textOf(clickedField);

        var filterContextVal = $('#filterContextValue').val();
        if (filterContextVal === '') {
            // filterContextVal has not been filled in yet.
            // It's the only required field (the others have default values).
            $('#filterContextValue').css('border', '2px solid red');
            return { filterWasApplied: false };
        }

        var ret = {
            clicked: clickedField,
            fieldName: fieldName,
            contextType: 'filter',
            filterWasApplied: true,
            filter: {
                name: fieldName,
                filterOp: $('#filterContextOp').val(),
                filterVal: filterContextVal,
                filterExistence: $('#filterContextExistence').val()
            }
        }

        $('.context').remove();
        return ret;
    };

    //////////////////////////////////////////////
    // DEPRECATED UNTIL FILTERS ARE RE-IMPLEMENTED
    var getFilterClickInformation = function (event) {
        // Handle clicks inside the filter context menu.
        // We only act on clicks for the Cancel button (removing this component)
        // and the Apply button (where we pull values from the context fields
        // and pass them back to the selection pane controller.)

        // returnVal.filterWasApplied is a sentinel value in the return object:
        // if it is false (the default), the click handler is a no-op. 
        // If it's true, we're safe to modify the field's DOM and the model 
        // with the new filter object.
        var fieldName = utils.textOf($(event.target).closest('.fieldList__item--inBucket'));
        var thingThatWasClicked = $(event.target).attr('id');
        var returnVal = {
            contextType: 'filter',
            filterWasApplied: false
        };
        switch (thingThatWasClicked) {
            case 'filterContextCancel':
                $('.context').remove();
                break;
            case 'filterContextApply':
                returnVal = tryToApplyFilter(event);
                break;
        }
        return returnVal;
    }

    var getClickInformation = function (event) {
        var contextType = $(event.target).closest('.context').data('contexttype');
        var returnValue;
        switch (contextType) {
            case "aggregator":
                returnValue = getAggregatorClickInformation(event);
                $('.context').remove();
                break;
            case "filter":
                returnValue = getFilterClickInformation(event);
                break;
        }
        return returnValue
    }


    /////////////////
    // PUBLIC METHODS
    /////////////////

    return {
        popMenu: popMenu,
        hideMenu: hideMenu,
        getClickInformation: getClickInformation
    };
})();