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

// SAVE-LOAD QUERIES

function makeNewStorageKey(storage) {
    var localLength = storage.length;
    var storageKey = 'model' + localLength.toString();
    return storageKey;
}

function saveQuery(storage, table) {
    var storageKey = makeNewStorageKey(storage);
    var storedData = { table: table, model: data.model };
    storage.setItem(storageKey, JSON.stringify(storedData));
}

function loadMostRecentQuery(storage, availableTables) {
    var storelen = storage.length;
    if (storelen === 0) { return; }
    var storageKey = 'model' + (storelen - 1);
    var loadedModel = JSON.parse(storage.getItem(storageKey));
    console.log('loading model: ' + JSON.stringify(loadedModel));
    loadQueryFromModel(availableTables, loadedModel);
}

function loadQueryFromModel(availableTables, newModel) {
    $('#tableSelector').val(newModel.table);
    $('#pivotTable').remove();
    view.resetState(availableTables[newModel.table]);
    data.model = newModel.model;
    var buckets = ["Values", "Filters", "Rows", "Columns"];
    buckets.forEach(function (buck) {
        var bucketarr = data.model[buck];
        bucketarr.forEach(function (elem) {
            addFieldToBucket(buck, elem.name);
        });
    });
    sendConfig();
}

function addFieldToBucket(bucket, fieldName) {
    view.addFieldToBucket(fieldName);
    var d = $('<div>')
        .addClass('fieldList__item')
        .addClass('fieldList__item--inBucket')
        .text(fieldName)
        .dblclick(function (event) {
            var target = $(event.target).closest('.fieldList__item--inBucket');
            var bucket = target.closest('.sortingBucket__fieldContainer').data('bucket');
            data.removeField(bucket, utils.textOf(target));
            sendConfig();
            view.removeDoubleClickedItem(target);
            view.removeFieldFromBucket(utils.textOf(target));
        });
    var bucketSelector = '[data-bucket="' + bucket + '"]';
    $(bucketSelector).append(d);

    var mockClick = view.makeClickInformation(fieldName, bucket, d);
    if (mockClick) { view.makeAdditionalUI(mockClick); }
}


$(function () {
    window.loadManager = new LoadStatusChecker();

    var currentDataset = $('#tableSelector').val();
    var storage = window.localStorage;

    $('#storeQuery__save').click(function (event) {
        saveQuery(storage, currentDataset);
    });

    $('#storeQuery__load').click(function (event) {
        loadMostRecentQuery(storage, window.availableTables);
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


    $('#getTable').click(function () {
        // Select a new table to configure. Resets the view and model.
        currentDataset = $('#tableSelector').val();
        $('#pivotTable').remove();
        view.resetState(availableTables[currentDataset]);
        data.init();
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