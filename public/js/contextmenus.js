var contextMenus = (function () {
    // Functions for handling context menus.

    ///////////////////////////
    // TEMPLATE HTML COMPONENTS
    ///////////////////////////

    // HTML for the aggregator selection menu.
    var aggregatorSelection = ['<div class="context sideby" data-contexttype="aggregator">',
        '<div class="contextBackground">',
        '<div class="metadataAnnotation" style="opacity:.8;margin-bottom:3px;">Summarize by</div>',
        '<div class="contextItem" data-aggregator="listagg">List unique</div>',
        '<div class="contextItem" data-aggregator="count">Count</div>',
        '<div class="contextItem" data-aggregator="sum">Sum</div>',
        '<div class="contextItem" data-aggregator="avg">Average</div>',
        '<div class="contextItem" data-aggregator="min">Min</div>',
        '<div class="contextItem" data-aggregator="max">Max</div>',
        '<div class="contextItem" data-aggregator="stddev">Std. Dev.</div>',
        '<div class="contextItem" data-aggregator="variance">Variance</div>',
        // '</div>',
        // '<div class="contextBackground">',
        // '<div class="metadataAnnotation" style="opacity:.8;margin-bottom:3px;">Display as</div>',
        // '<div class="contextItem" data-displayas="raw">Raw value</div>',
        // '<div class="contextItem" data-displayas="row">% row total</div>',
        // '<div class="contextItem" data-displayas="col">% column total</div>',
        // '<div class="contextItem" data-displayas="total">% grand total</div>',
        '</div>',
        '</div >'].join("\n");

    // HTML for the filter context menu.
    // If you are adding a new value here, you MUST ADD a 
    // matching keyed predicate in tpivot.filterPredicates() 
    var filterSelection = [
        '<div class="filterContext context contextBackground" data-contexttype="filter">',
        '<div class="filterContextEntry" id="filterFieldNameEntry">',
        'Show rows where $field</div>',
        '<div class="filterContextEntry">',
        '<span><select id="filterContextExistence">',
        '<option>is</option>',
        '<option>is not</option>',
        '</select></span>',
        '<span>',
        '<select id="filterContextOp">',
        '<option>less than</option>',
        '<option>equal to</option>',
        '<option>greater than</option>',
        '<option>including</option>',
        '</select>',
        '</span>',
        '<span>',
        '<input type="text" maxlength="18" id="filterContextValue">',
        '</span>',
        '</div>',
        '<div class="filterContextEntry" style="justify-content:flex-end;">',
        '<button id="filterContextCancel">Cancel</button>',
        '<button id="filterContextApply">Apply</button>',
        '</div>',
        '</div>'].join("\n");


    ///////////////////////////////////////////////////
    // 'POP' CONTEXT MENUS TO INITIALIZE AND ADD TO DOM
    ///////////////////////////////////////////////////

    var makeContextHtml = function (htmlString, event, elementToAppend) {
        // purely side-effecting function to create the html for a new 
        // filter/aggregator context menu and append it to the proper element.
        $(htmlString)
            // this append is important--we find the field name later b
            // calling closest('.sortableItem').attr('id')
            .appendTo(elementToAppend)
            .show(200)
            .css({ top: event.pageY + 'px', left: event.pageX + 'px' });
    }

    var popAggregatorMenu = function (model, event, clickedSortList, clickedSortItem) {
        makeContextHtml(aggregatorSelection, event, clickedSortItem);
        // highlight the current aggregator function
        var fieldName = nameFromID($(clickedSortItem).attr('id'));
        var reducerObj = getAggregatorObj(model, fieldName);
        var currentlySelectedAggregator = reducerObj.reducer;
        var currentlySelectedDisplayAs = reducerObj.displayAs;
        $('.contextItem')
            .filter("[data-aggregator='" + currentlySelectedAggregator + "']")
            .addClass('selectedContextItem');
        // display-as fields are deprecated for now. 
        $('.contextItem')
            .filter("[data-displayas='" + currentlySelectedDisplayAs + "']")
            .addClass('selectedContextItem');
    }

    var popFilterMenu = function (model, event, clickedSortList, clickedSortItem) {
        makeContextHtml(filterSelection, event, clickedSortItem);
        var fieldName = nameFromID($(clickedSortItem).attr('id'));
        var filter = getFilterObj(model, fieldName);
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
        if (!$(event.target).closest('.sortableItem').length > 0) {
            return;
        }
        event.preventDefault();
        var clickedSortItem = $(event.target).closest('.sortableItem');
        var clickedSortList = $(event.target).closest('.sortableList').attr('id');

        switch (nameFromID(clickedSortList)) {
            // set base HTML for the new element
            case 'Values':
                popAggregatorMenu(model, event, clickedSortList, clickedSortItem);
                break;
            case 'Filters':
                popFilterMenu(model, event, clickedSortList, clickedSortItem);
                break;
            default: return;
        }
    };


    ////////////////////
    // HIDE CONTEXT MENU
    ////////////////////

    var hideMenu = function (event) {
        if (!$(event.target).parents('.context').length > 0) {
            $('.context').remove();
        }
    }


    //////////////////////////////////////////////////////
    // GET INFORMATION WHEN A CONTEXT IS CLICKED.
    // SENT BACK TO SELECTION PANE TO MODIFY MODEL AND DOM
    //////////////////////////////////////////////////////

    var getAggregatorClickInformation = function (event) {
        var fieldName = nameFromID($(event.target).closest('.sortableItem').attr('id'));
        return {
            contextType: "aggregator",
            fieldName: fieldName,
            selectedReducer: $(event.target).data("aggregator"),
            // display-as fields are deprecated for now. 
            selectedDisplayAs: $(event.target).data("displayas")
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
        var fieldName = nameFromID($(event.target).closest('.sortableItem').attr('id'));

        var filterContextVal = $('#filterContextValue').val();
        if (filterContextVal === '') {
            // filterContextVal has not been filled in yet.
            // It's the only required field (the others have default values).
            $('#filterContextValue').css('border', '2px solid red');
            return { filterWasApplied: false };
        }

        var ret = {
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
        var fieldName = nameFromID($(event.target).closest('.sortableItem').attr('id'));
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