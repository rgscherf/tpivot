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


function sendConfig() {
    // Called any time:
    // - a field is added to a sorting bucket
    // - a field is removed from a sorting bucket
    // - a bucket is rearranged.
    var model = data.model;
    var loadManager = window.loadManager;
    console.log('Sending model: ' + JSON.stringify(model));
    var loadId = loadManager.registerId();
    view.addLoadingSpinner();
    var payload = {
        table: view.getCurrentDbInfo(),
        model: model
    };
    $('#loading__stopLoad').prop('disabled', false);
    $.ajax({
        type: "post",
        url: queryProcessURL,
        data: JSON.stringify(payload),
        success: function (returnData) {
            if (loadManager && loadManager.idIsInBuffer(loadId)) {
                if (loadManager.isMostRecentId(loadId)) {
                    view.removeLoadingSpinner();
                }
                if (loadManager.bufferIsEmpty()) {
                    $('#loading__stopLoad').prop('disabled', 'disabled');
                }
                tpivot.renderPivot(returnData);
            }
        },
        error: function (x, stat, err) {
            console.log("AJAX REQUEST FAILED");
            console.log(x, stat, err);
            view.removeLoadingSpinner();
            tpivot.renderTimeout();

            if (loadManager.bufferIsEmpty()) {
                $('#loading__stopLoad').prop('disabled', 'disabled');
            }
        }
    });
}

var RequestLoadManager = function () {
    /*
    when a request is sent, its id is added to a buffer here.
    when a response is received,
        if its id is still in the buffer, remove id from buffer and proceed with response
            and if it's the most recent response sent (by checking that id is last element of buffer), remove load spinner.
        else discard response
    user can clear the buffer at any time thru UI.
    */
    this.loadBuffer = [];

    this.registerId = function () {
        var loadId = Math.random().toString();
        this.loadBuffer.push(loadId);
        return loadId;
    }

    this.isMostRecentId = function (id) {
        var lastElementInBuffer = this.loadBuffer[this.loadBuffer.length - 1];
        if (id === lastElementInBuffer) {
            this.loadBuffer.pop();
            return true;
        } else {
            return false;
        }
    }

    this.idIsInBuffer = function (id) {
        return this.loadBuffer.indexOf(id) !== -1;
    }

    this.clearBuffer = function () {
        view.removeLoadingSpinner();
        $('#loading__stopLoad').prop('disabled', 'disabled');
        this.loadBuffer = [];
    }

    this.bufferIsEmpty = function () {
        return this.loadBuffer.length === 0;
    }
};


function addFieldToBucket(bucket, fieldName) {
    view.addFieldToBucket(fieldName);
    if (bucket === 'Filters') {
        contextMenus.getDistinctFieldEntries(fieldName);
    }
    var d = $('<div>')
        .addClass('fieldList__item')
        .addClass('fieldList__item--inBucket')
        .addClass('sortingBucket--bold')
        .text(fieldName)
        .hover(function enter(event) {
            $(tutils.closeButton)
                .appendTo($(this))
                .addClass('closeButton')
                .click(function (event) {
                    var target = $(event.target).closest('.fieldList__item--inBucket');
                    var bucket = target.closest('.sortingBucket__fieldContainer').data('bucket');
                    data.removeField(bucket, utils.textOf(target));
                    sendConfig();
                    view.removeDoubleClickedItem(target);
                    view.removeFieldFromBucket(utils.textOf(target));
                });
        }, function exit(event) {
            $(this).children('.closeButton').remove();
        });
    var bucketSelector = '[data-bucket="' + bucket + '"]';
    $(bucketSelector).append(d);
    var mockClick = view.makeClickInformation(fieldName, bucket, d);
    if (mockClick) { view.makeAdditionalUI(mockClick); }
}


$(function () {
    window.loadManager = new RequestLoadManager();

    $('#storeQuery__unload').click(function (event) {
        $(this).blur();
        queryStore.unloadQuery();
    });

    $('#storeQuery__saveUpdate').click(function (event) {
        $(this).blur();
        queryStore.updateQuery(view.getCurrentDbInfo(), data.model);
    });

    $('#storeQuery__saveNew').click(function (event) {
        $(this).blur();
        queryStore.saveQuery(view.getCurrentDbInfo(), data.model);
    });

    $('#storeQuery__load').click(function (event) {
        $(this).blur();
        queryStore.loadQueryMenu();
    });

    $('#charting__showLine').click(function (event) {
        $(this).blur();
        tchart.renderChartDialog(pivotState.applyTransform(), 'line');
    });

    $('#charting__showBar').click(function (event) {
        $(this).blur();
        tchart.renderChartDialog(pivotState.applyTransform(), 'bar');
    });

    $('#loading__stopLoad').click(function (event) {
        if (window.loadManager) {
            $(this).blur();
            window.loadManager.clearBuffer();
        }
    });

    $('.queryBuilder__child--notSelectable').disableSelection();

    $('.fieldReceiver')
        .sortable({
            containment: 'parent',
            axis: 'y',
            items: '> .fieldList__item',
            update: function (event, ui) {
                var bucket = ui.item.closest('.sortingBucket__fieldContainer').data('bucket');
                data.reorderItemsInBucket(bucket);
                sendConfig();
            }
        })
        .disableSelection()
        .droppable({
            accept: function (droppedElement) {
                return data.canDropHere($(this), $(droppedElement));
            },
            drop: function (event, ui) {
                data.addField($(this).data('bucket'), ui.helper.text());
                var bucket = $(this).data('bucket');
                var fieldName = ui.helper.text();
                addFieldToBucket(bucket, fieldName);
                sendConfig();
            }
        });


    $('#getDB').click(function () {
        // Select a database. Poplates table selector. Resets the view and model.
        $(this)
            .blur()
            .removeClass('btn-warning')
            .addClass('btn-default');
        var selectedDb = $('#dbSelector').val();
        $('#pivotTable').remove();
        view.switchToNewDb(selectedDb);
        data.init();
    });

    $('#getTable').click(function () {
        // Select a new table to configure. Resets the view and model.
        $(this)
            .blur()
            .removeClass('btn-warning')
            .addClass('btn-default');
        var currentTable = $('#tableSelector').val();
        $('#pivotTable').remove();
        view.switchToNewTable(currentTable);
        data.init();
    });


    ///////////////////////////
    // SHOW AND HIDE QUERY PANE
    ///////////////////////////

    var selectionPaneHidden = false;
    $('#selectionPaneShowHide').click(function () {
        $(this).blur();
        if (selectionPaneHidden) {
            $('.hideable').show();
            $(this).find('.toolbar__buttonLabel').text("Hide builder");
            $(this).find('i').removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            $('.hideable').hide();
            $(this).find('.toolbar__buttonLabel').text("Show builder");
            $(this).find('i').removeClass('fa-eye-slash').addClass('fa-eye');
        }
        selectionPaneHidden = !selectionPaneHidden;
    });


    //////////////////////////////////
    // EVENT BINDING FOR CONTEXT MENUS
    //////////////////////////////////

    $(document).on('contextmenu', function (event) {
        // We pass model to make initial transformations
        // such as highlighting default values.
        console.log('got contextmenu from: ' + event.target);
        contextMenus.popMenu(data.model, event);
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
                data.setAggregator(clickInformation);
                view.makeAdditionalUI(clickInformation);
                sendConfig();
                break;
            case "filter":
                if (clickInformation.filterWasApplied) {
                    data.setFilter(clickInformation.filter);
                    view.makeAdditionalUI(clickInformation);
                    sendConfig();
                }
                break;
            default:
                break;
        }
    });
});