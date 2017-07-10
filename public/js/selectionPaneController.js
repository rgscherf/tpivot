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


////////
// UTILS
////////

function nameFromID(id) {
    // Get the name of a DOM id.
    // The id naming scheme is /sort(field|col)-/ + name.
    return id.split("-").slice(1).join(" ");
};

function getColNames(cols) {
    return cols.map(function (elem) {
        return nameFromID(elem);
    });
}

var textOf = function (jqElem) {
    return jqElem.contents().get(0).nodeValue;
}

//////////////////////
// MODIFYING THE MODEL 
/////////////////////

// INITIALIZE MODEL

function initModel() {
    // Return initial model state.
    return {
        Columns: [],
        Rows: [],
        Filters: [],
        Values: []
    };
};


function resetState(selectedTableObject) {
    var selectedFields = selectedTableObject.headers;
    // remove any previous sortable elements
    removeSortableFieldsFromDOM();
    // now add sortable elements for new fields
    addSortableFieldsToDOM(selectedFields);
    // make + return a new model
    return initModel();
}


// ADDING TO A COLUMN

function addField(model, field, bucket) {
    var fieldAsObject = { name: field };
    switch (bucket) {
        case "Filters":
            fieldAsObject.filterExistence = true;
            fieldAsObject.filterOp = "less than";
            fieldAsObject.filterVal = "";
            break;
        case "Values":
            fieldAsObject.reducer = "listagg";
            fieldAsObject.displayAs = "raw";
            break;
        default:
            break;
    }
    model[bucket].push(fieldAsObject);
}

function removeField(model, field, bucket) {
    model[bucket] = model[bucket].filter(function (elem) {
        return elem.name != field;
    });
}

// DEPRECATED
function addFieldToCol(model, fieldNameAsID, colNameAsID) {
    // update model object with item's location and default data.
    var colName = nameFromID(colNameAsID);
    var fieldName = nameFromID(fieldNameAsID);

    var item = constructFieldObj(fieldName, colName);
    model[colName].push(item);
};

// DEPRECATED
function constructFieldObj(fieldName, colName) {
    // init item's state upon moving it to a new field.
    var baseObj = {
        name: fieldName
    };
    switch (colName) {
        case "Filters":
            baseObj.filterExistence = true;
            baseObj.filterOp = "less than";
            baseObj.filterVal = "";
            break;
        case "Values":
            baseObj.reducer = "listagg";
            baseObj.displayAs = "raw";
            break;
        default:
            break;
    }
    return baseObj;
}


// REMOVING FROM A COLUMN

// DEPRECATED
function removeFieldFromCol(model, fieldNameAsID, colNameAsID) {
    var fieldName = nameFromID(fieldNameAsID);
    var colName = nameFromID(colNameAsID);
    model[colName] = model[colName].filter(function (elem) {
        return elem.name !== fieldName;
    })
};


// REORDERING WITHIN A COLUMN

function getOrderedColFields(colName) {
    // Get the ordered list of model for this column from the DOM.
    // Called after a sort is performed.
    var jqueryColName = "#" + colName;
    var orderedItems = ($(jqueryColName).sortable('toArray'));
    return orderedItems.map(function (elem) {
        return nameFromID(elem);
    });
};

function doColumnReorder(colObjects, orderedFieldNames) {
    // iterate through orderedFieldNames, building an (ordered) array
    // of field objects matching on the name.
    var orderedItems = orderedFieldNames.map(function (elem) {
        var singleObject = colObjects.filter(function (obj) {
            return obj.name === elem;
        })[0];
        return singleObject;
    })
    return orderedItems;
}

function reorderFields(model, colNameAsID) {
    // get correct order for model in this Column
    var orderedColFields = getOrderedColFields(colNameAsID);

    // reorder column array to match correct order
    var colName = nameFromID(colNameAsID);
    var unorderedColObjs = model[colName];
    model[colName] = doColumnReorder(unorderedColObjs, orderedColFields);
};


// SET FILTER AND VALUE OBJECTS

function findObjInColumn(bucket, fieldName) {
    return bucket.filter(function (elem) {
        return elem.name === fieldName;
    })[0];
}

// GET FILTER AND VALUE OBJECTS

function getAggregator(model, fieldName) {
    return findObjInColumn(model.Values, fieldName);
}

function setAggregator(model, newReducer) {
    // check contextmenu.getAggregatorClickInformation to see
    // the shape of the newReduer object.
    var reducerInModel = getAggregator(model, newReducer.fieldName);

    var selectedReducer = newReducer.selectedReducer;
    var selectedDisplayAs = newReducer.selectedDisplayAs;
    if (selectedReducer) {
        reducerInModel.reducer = selectedReducer;
    }
    if (selectedDisplayAs) {
        reducerInModel.displayAs = selectedDisplayAs;
    }
}

function getFilter(model, fieldName) {
    return findObjInColumn(model.Filters, fieldName);
}

function setFilter(model, newFilter) {
    // check contextmenu.tryToApplyFilter to see
    // the shape of the newFilter object.
    var oldFilter = getFilter(model, newFilter.name);
    oldFilter.filterExistence = newFilter.filterExistence === 'is';
    oldFilter.filterOp = newFilter.filterOp;
    oldFilter.filterVal = newFilter.filterVal;
}


/////////////////////
// MODIFYING THE VIEW
/////////////////////

function makeFilterText(model, fieldName) {
    var filterObj = getFilter(model, fieldName);
    var is = filterObj.filterExistence ? "is" : "is not";
    return "(" + is + " " + filterObj.filterOp + " " + filterObj.filterVal + ")";
}

function makeClickInformation(model, fieldName, bucket, appendElement) {
    // Return click information (for modifyDOMFromClick) with arbitraty information.
    if (bucket != 'Values' && bucket != 'Filters') { return null; }
    return {
        contextType: bucket == 'Values' ? 'aggregator' : 'filter',
        fieldName: fieldName,
        clicked: appendElement
    }
}

function makeAdditionalUI(model, clickInformation) {
    clickInformation.clicked.find('.additionalUI').remove();
    var text = '';
    switch (clickInformation.contextType) {
        case 'aggregator':
            text = '(' + getAggregator(model, clickInformation.fieldName).reducer + ' of)';
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


function removeSortableFieldsFromDOM() {
    $('.fieldList__item').remove();
}

function spaceSafeFieldName(fieldName) {
    return fieldName.split(' ').join('-');
}

function constructSortableField(fieldName) {
    var ssFieldName = spaceSafeFieldName(fieldName);
    var d = $('<div>')
        .addClass('fieldList__item draggableItem field')
        .attr('id', 'sortField-' + ssFieldName)
        .text(ssFieldName)
        .disableSelection()
        .draggable({
            helper: "clone",
            revert: "invalid"
        });
    return d;
}

function addSortableFieldsToDOM(fieldsToAdd) {
    fieldsToAdd.forEach(function (elem) {
        var field = constructSortableField(elem);
        field.appendTo('#sortCol-noField');
    });
}


function sendConfig(model) {
    printObj(model, 'sending model: ');
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
            tpivot.renderPivot(returnData);
        },
        error: function (x, stat, err) {
            console.log("AJAX REQUEST FAILED");
            console.log(x, stat, err);
        }
    });
}


//////////////////////////////
// CAN I DROP THIS FIELD HERE?
//////////////////////////////

// We are trying to mirror Excel's rules for which buckets can contain the same item.
// Note: Excel will swap field locations when the field cannot drop. We choose to deny the drop
// (so that filter/value selections don't get lost.)

// Also, we allow filters to go with any field. Excel disallows duplicate fields in filters, but then
// allows users to separately filter any field. We keep all filtering in the filter bucket.

// In these tables:
// Along top: field already in this bucket.
// Along side: field wants to drop in this bucket.
// F = filters, C = columns, R = rows, V = values.
// X = no, O = yes

// Here are Excel's rules:
//   F C R V
// F X X X O
// C X X X O
// R X X X O
// V O O O X

// Here are our rules:
//   F C R V
// F X O O O
// C O X X O
// R O X X O
// V O O O X

// So the only drops that are disallowed are:
// - When the field already exists in the target bucket.
// - When you are dropping into a row/col and the field exists in the opposite bucket.

function isOpposingBucketClear(bucketToTest, droppedFieldName) {
    // Given a field and a bucket, test whether the field already exists in the bucket.
    // See above for discussion of which buckets are allowed to contain overlapping fields.
    var bucketSelector = '[data-bucket="' + bucketToTest + '"]';
    var bucketChildrenNames = [];
    $(bucketSelector)
        .children()
        .filter('.fieldList__item')
        .each(function (idx, elem) {
            bucketChildrenNames.push(textOf($(elem)));
        });

    if (bucketChildrenNames.length == 0) { return true; }
    else { return (bucketChildrenNames.indexOf(droppedFieldName) == -1); }
}


function canDropHere(container, droppedElement) {
    if (!container) { return false; }
    if (!droppedElement.hasClass('field')) { return false; }
    var ret = true;
    container
        .children()
        .filter('.fieldList__item')
        .each(function (idx, elem) {
            if (textOf($(elem)) === textOf(droppedElement)) {
                ret = false;
            }
        });

    if (ret) {
        var bucket = container.data('bucket');
        switch (bucket) {
            case 'Rows':
                ret = isOpposingBucketClear('Columns', textOf(droppedElement));
                break;
            case 'Columns':
                ret = isOpposingBucketClear('Rows', textOf(droppedElement));
                break;
            default:
                break;
        }
    }
    return ret;
}


/////////////
// CONTROLLER
/////////////

// tableData is all of the rows in the current data set.
// managed as a widow var because it's set asynchronously
// in getTableData.
var tableData;
function setTableData(newTB) {
    tableData = newTB;
}
function refreshPivot(model) {
    if (tableData) {
        tpivot.renderPivot(tableData);
    }
}

function printObj(obj, prefix) {
    var pre = prefix === undefined ? '' : prefix;
    console.log(prefix + JSON.stringify(obj));
}

function removeDoubleClickedItem(element) {
    var itemClass = 'fieldList__item--inBucket';

    if (element.hasClass(itemClass)) {
        element.remove();
    } else {
        element.closest('.' + itemClass).remove();
    }
}

$(function () {
    var cols = ['#sortCol-noField', '#sortCol-Filters', '#sortCol-Rows', '#sortCol-Columns', '#sortCol-Values'];
    var colNames = getColNames(cols);

    var currentDataset = $('#tableSelector').val();
    var model = {};

    $('.fieldReceiver')
        .sortable({
            containment: 'parent',
            axis: 'y',
            items: '> .fieldList__item'
            // TODO: arrange model based on this sort
            // TODO: and send config
        })
        .disableSelection()
        .droppable({
            accept: function (droppedElement) {
                return canDropHere($(this), $(droppedElement));
            },
            drop: function (event, ui) {
                addField(model, ui.helper.text(), $(this).data('bucket'));
                var d = $('<div>')
                    .addClass('fieldList__item')
                    .addClass('fieldList__item--inBucket')
                    .text(ui.helper.text())
                    .dblclick(function (event) {
                        var target = $(event.target).closest('.fieldList__item--inBucket');
                        var bucket = target.closest('.sortingBucket__fieldContainer').data('bucket');
                        removeField(model, textOf(target), bucket)
                        sendConfig(model);
                        removeDoubleClickedItem(target);
                    });
                $(this).append(d);

                var mockClick = makeClickInformation(model, ui.helper.text(), $(this).data('bucket'), d);
                if (mockClick) { makeAdditionalUI(model, mockClick); }

                sendConfig(model);
            }
        });

    $('#getTable').click(function () {
        // Select a new table to configure. Resets the view and model.
        currentDataset = $('#tableSelector').val();
        $('#pivotTable').remove();
        model = resetState(availableTables[currentDataset]);
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
        var clickInformation = contextMenus.getClickInformation(event, model);
        if (!clickInformation || !clickInformation.contextType) { return; }
        switch (clickInformation.contextType) {
            case "aggregator":
                setAggregator(model, clickInformation);
                makeAdditionalUI(model, clickInformation);
                sendConfig(model);
                break;
            case "filter":
                if (clickInformation.filterWasApplied) {
                    setFilter(model, clickInformation.filter);
                    makeAdditionalUI(model, clickInformation);
                    sendConfig(model);
                }
                break;
            default:
                break;
        }
    });
});
