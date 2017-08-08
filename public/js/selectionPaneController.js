'use strict';

/*

Given a list of data sets provided by the server,
The user can select a data set to load its fields 
And then arrange those fields into a pivot table configuration.
When the user is happy, she sends the configuration back to the server 
To fetch data that will populate the pivot table.

The state of the user's selections is updated in real-time.

A model state looks like:
{noField: [obj], Filters: [obj], Rows: [obj], Columns: [obj], Values: [obj]}

... whose field names correspond to the Microsoft Excel pivot table UI.

NB, 'noField' contains field objects that have not been categorized by the user. 
Any fields in this collection will not have their data returned from the server 
when the pivot table is rendered.

Each obj in the model is one of (depending on its field in the model object):
{name: $fieldname} <- for noField, Rows, Columns
{name: $fieldname, filterOp: $filterOpName, filterVal: $filterValName, filterExistence: $(true|false)} <- for Filters
{name: $fieldname, reducer: $reducerFnName, displayAs: (raw|col|row|total)} <- for Values
*/


function sendConfig(model, loadManager) {
    // Called any time:
    // - a field is added to a sorting bucket
    // - a field is removed from a sorting bucket
    // - a bucket is rearranged.
    console.log('Sending model: ' + JSON.stringify(model));
    var loadId = loadManager.setId();
    view.addLoadingSpinner();
    var currentTable = $("#tableSelector").val()
    var payload = {
        table: currentTable,
        model: model
    };
    $.ajax({
        type: "post",
        url: queryProcessURL,
        data: JSON.stringify(payload),
        success: function (returnData) {
            if (loadManager && loadManager.checkId(loadId)) {
                view.removeLoadingSpinner();
            }
            tpivot.renderPivot(returnData);
        },
        error: function (x, stat, err) {
            console.log("AJAX REQUEST FAILED");
            console.log(x, stat, err);
            view.removeLoadingSpinner();
            tpivot.renderTimeout();
        }
    });
}

var LoadStatusChecker = function () {
    this.loadId = '';

    this.setId = function () {
        this.loadId = Math.random().toString();
        return this.loadId;
    }

    this.checkId = function (id) {
        return id === this.loadId;
    }
};


$(function () {
    var currentDataset = $('#tableSelector').val();
    var model = data.init();
    var loadManager = new LoadStatusChecker();

    $('.queryBuilder__child--notSelectable').disableSelection();

    $('.fieldReceiver')
        .sortable({
            containment: 'parent',
            axis: 'y',
            items: '> .fieldList__item',
            update: function (event, ui) {
                var bucket = ui.item.closest('.sortingBucket__fieldContainer').data('bucket');
                model = data.reorderItemsInBucket(model, bucket);
                sendConfig(model, loadManager);
            }
        })
        .disableSelection()
        .droppable({
            accept: function (droppedElement) {
                return data.canDropHere($(this), $(droppedElement));
            },
            drop: function (event, ui) {
                model = data.addField(model, $(this).data('bucket'), ui.helper.text());
                view.addFieldToBucket(ui.helper.text());
                var d = $('<div>')
                    .addClass('fieldList__item')
                    .addClass('fieldList__item--inBucket')
                    .text(ui.helper.text())
                    .dblclick(function (event) {
                        var target = $(event.target).closest('.fieldList__item--inBucket');
                        var bucket = target.closest('.sortingBucket__fieldContainer').data('bucket');
                        model = data.removeField(model, bucket, utils.textOf(target));
                        sendConfig(model, loadManager);
                        view.removeDoubleClickedItem(target);
                        view.removeFieldFromBucket(utils.textOf(target));
                    });
                $(this).append(d);

                var mockClick = view.makeClickInformation(model, ui.helper.text(), $(this).data('bucket'), d);
                if (mockClick) { view.makeAdditionalUI(model, mockClick); }

                sendConfig(model, loadManager);
            }
        });

    $('#getTable').click(function () {
        // Select a new table to configure. Resets the view and model.
        currentDataset = $('#tableSelector').val();
        $('#pivotTable').remove();
        view.resetState(availableTables[currentDataset]);
        model = data.init();

    });


    ///////////////////////////
    // SHOW AND HIDE QUERY PANE
    ///////////////////////////

    var selectionPaneHidden = false;
    $('#selectionPaneShowHide').click(function () {
        if (selectionPaneHidden) {
            $('.hideable').show();
            $(this).text("Hide query pane");
        } else {
            $('.hideable').hide();
            $(this).text("Show query pane");
        }
        selectionPaneHidden = !selectionPaneHidden;
    });


    //////////////////////////////////
    // EVENT BINDING FOR CONTEXT MENUS
    //////////////////////////////////

    $(document).on('contextmenu', function (event) {
        // We pass model to make initial transformations
        // such as highlighting default values.
        contextMenus.popMenu(model, event);
    });

    $(document).on('mousedown', function (event) {
        contextMenus.hideMenu(event);
    });

    $(document).on('click', '.context', function (event) {
        // Handle context menu clicks. If the click will change model state,
        // update the model and send new model to the server.
        // (For aggregator, any click is successful. 
        // For filters, any click that produces a new filter.)
        var clickInformation = contextMenus.getClickInformation(event);
        if (!clickInformation || !clickInformation.contextType) { return; }
        switch (clickInformation.contextType) {
            case "aggregator":
                model = data.setAggregator(model, clickInformation);
                view.makeAdditionalUI(model, clickInformation);
                sendConfig(model, loadManager);
                break;
            case "filter":
                if (clickInformation.filterWasApplied) {
                    model = data.setFilter(model, clickInformation.filter);
                    view.makeAdditionalUI(model, clickInformation);
                    sendConfig(model, loadManager);
                }
                break;
            default:
                break;
        }
    });
});