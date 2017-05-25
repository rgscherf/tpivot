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

//////////////////////
// MODIFYING THE MODEL 
/////////////////////

// INITIALIZE MODEL

function initModel(colNames, fieldNames) {
	// Take field names and set them to initial state.
	var modelObject = {};
	colNames.forEach(function (elem) {
		modelObject[elem] = [];
	});
	fieldNames.map(function (elem) {
		modelObject["noField"].push({
			name: elem
		});
	});
	return modelObject;
};


function resetState(colNames, selectedTableObject) {
	var selectedFields = selectedTableObject.headers;
	// remove any previous sortable elements
	removeSortableFieldsFromDOM();
	// now add sortable elements for new fields
	addSortableFieldsToDOM(selectedFields);
	// make + return a new model
	return initModel(colNames, selectedFields);
}


// ADDING TO A COLUMN

function addFieldToCol(model, fieldNameAsID, colNameAsID) {
	// update model object with item's location and default data.
	var colName = nameFromID(colNameAsID);
	var fieldName = nameFromID(fieldNameAsID);

	var item = constructFieldObj(fieldName, colName);
	model[colName].push(item);
};

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

function findObjInColumn(model, fieldName, colToSearch) {
	return model[colToSearch].filter(function (elem) {
		return elem.name === fieldName;
	})[0];
}

function setReducer(model, newReducer) {
	// check contextmenu.getAggregatorClickInformation to see
	// the shape of the newReduer object.
	var fieldName = newReducer.fieldName;
	var reducerInModel = findObjInColumn(model, fieldName, "Values");

	var selectedReducer = newReducer.selectedReducer;
	var selectedDisplayAs = newReducer.selectedDisplayAs;
	if (selectedReducer) {
		reducerInModel.reducer = selectedReducer;
	}
	if (selectedDisplayAs) {
		reducerInModel.displayAs = selectedDisplayAs;
	}
}

function setFilter(model, newFilter) {
	var oldFilter = findObjInColumn(model, newFilter.name, "Filters");
	oldFilter.filterExistence = newFilter.filterExistence === 'is';
	oldFilter.filterOp = newFilter.filterOp;
	oldFilter.filterVal = newFilter.filterVal;
}

// GET FILTER AND VALUE OBJECTS

function getAggregatorObj(model, fieldName) {
	return findObjInColumn(model, fieldName, "Values");
}

function getFilterObj(model, fieldName) {
	return findObjInColumn(model, fieldName, "Filters");
}


/////////////////////
// MODIFYING THE VIEW
/////////////////////

var reducerSelect = ['<select class="additionalUI reducerSelect">',
	'<option value="count" selected>Count</option>',
	'<option value="sum">Sum</option>',
	'<option value="average">Average</option>',
	'<option value="min">Min</option>',
	'<option value="max">Max</option>',
	'<option value="countUnique">Count unique</option>',
	'<option value="listUnique">List unique</option>',
	'</select>'].join('\n');

var filterOpSelect = ['<select class="additionalUI filterOp">',
	'<option value="lt" selected><</option>',
	'<option value="eq">==</option>',
	'<option value="gt">></option>',
	'<option value="has">has</option>',
	'</select>'].join('\n');

var filterExistenceSelect = ['<select class="additionalUI filterExist">',
	'<option value="is" selected>is</option>',
	'<option value="isNot">not</option>',
	'</select>'].join('\n');

var filterValText = '<input class="additionalUI filterVal" type="text" placeholder=" " maxlength="16">';

function makeFilterText(model, fieldName) {
	var filterObj = getFilterObj(model, fieldName);
	var is = filterObj.filterExistence ? "is" : "is not";
	return "(" + is + " " + filterObj.filterOp + " " + filterObj.filterVal + ")";
}
function modifyItemDOM(model, fieldNameAsID, colName) {
	// moving a field to/from the Filters or Values column will mutate its DOM
	// to add additional options for that field.
	// this function adds additional dom and binds events to act on the model
	// in response to those events.
	var fieldName = nameFromID(fieldNameAsID);
	var findableFieldName = "#" + fieldNameAsID;
	var itemFlexBox = $(findableFieldName);
	// Remove filter/reducer UI. Remember that this fn only fires on moving to a new col,
	// so there's no risk of losing additional UI that still contains pertinent info.
	itemFlexBox.find('.additionalUI').remove();
	switch (colName) {
		case "Values":
			var textOfAggregator = getAggregatorObj(model, fieldName).reducer;
			$('<div class="additionalUI metadataAnnotation">(' + textOfAggregator + ')</div>')
				.appendTo(itemFlexBox)
			break;
		case "Filters":
			var textOfFilter = makeFilterText(model, fieldName);
			$('<div class="additionalUI metadataAnnotation">' + textOfFilter + '</div>')
				.appendTo(itemFlexBox)
			break;

		default:
			break;
	}
}

function removeSortableFieldsFromDOM() {
	$('.sortableItem').remove();
}

function spaceSafeFieldName(fieldName) {
	return fieldName.split(' ').join('-');
}

function constructSortableField(fieldName) {
	var ssFieldName = spaceSafeFieldName(fieldName);
	return ['<li class="sortableItem" id="sortField-' + ssFieldName + '">',
	'<div class="sortableItemName">' + fieldName + '</div>',
		'</li>'].join('\n');
}
function addSortableFieldsToDOM(fieldsToAdd) {
	fieldsToAdd.forEach(function (elem) {
		$(constructSortableField(elem)).appendTo('#sortCol-noField');
	})
}


function sendConfig(model) {
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


// DYNAMIC DOM MODIFICATION FOR SELECTION PANEL

function setPanelShowHideWidth() {
	// correctly size the show/hide pane button to match the selection panel UI
	var panelWidth = $('#pivotQuery').css('width');
	$('#selectionPaneShowHide').css('width', panelWidth);
}

function setTableColumnListShape() {
	// give the list of table fields a correct number of columns
	// so that the whole list can be viewed without scrolling.
	var ENTRIES_PER_COL = 20;
	var numFields = $('.sortableItem').length;
	var numCols = Math.ceil(numFields / ENTRIES_PER_COL);
	$('.tableColumnList').css('column-count', numCols);
}

function setSelectionPanelDynamicDOM() {
	setTableColumnListShape();
	setPanelShowHideWidth();
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

$(function () {
	var cols = ['#sortCol-noField', '#sortCol-Filters', '#sortCol-Rows', '#sortCol-Columns', '#sortCol-Values'];
	var colNames = getColNames(cols);

	var currentDataset = $('#tableSelector').val();
	var model;

	setSelectionPanelDynamicDOM();

	// when adding/removing/reordering fields, we update the model and send it to server in the
	// sortable list's `update` event. This event fires twice per user action: once for the item
	// leaving a list, and once for entering the new list. Therefore, we only want to act on every
	// second firing of `update` when the model state is fully captured. 
	// This var is checked in `update` and, if true, we continue with our logic. In either case, 
	// its value is flipped.

	// set up sortable lists
	cols.map(function (elem) {
		$(elem).sortable({
			connectWith: cols,
			dropOnEmpty: true,
			placeholder: 'placeholder',
			remove: function (event, ui) {
				removeFieldFromCol(model, ui.item[0].id, event.target.id);
			},
			receive: function (event, ui) {
				var fieldNameAsID = ui.item[0].id;
				var colNameAsID = event.target.id;
				addFieldToCol(model, fieldNameAsID, colNameAsID);
				modifyItemDOM(model, fieldNameAsID, nameFromID(colNameAsID));
			},
			stop: function (event, ui) {
				var columnID = event.target.id;
				reorderFields(model, columnID);
				sendConfig(model);
				var displayModel = {
					Rows: model.Rows,
					Columns: model.Columns,
					Values: model.Values,
					Filters: model.Filters
				};
				console.log(JSON.stringify(displayModel));
			}
		});
	});

	$('#getTable').click(function () {
		// Select a new table to configure. Resets the view and model.
		currentDataset = $('#tableSelector').val();
		$('#pivotTable').remove();
		model = resetState(colNames, availableTables[currentDataset]);
		setSelectionPanelDynamicDOM();
	});


	///////////////////////////
	// SHOW AND HIDE QUERY PANE
	///////////////////////////

	var selectionPaneHidden = false;
	$('#selectionPaneShowHide').click(function () {
		if (selectionPaneHidden) {
			$('#pivotQuery').show();
			$(this).text("Hide query pane");
			setSelectionPanelDynamicDOM();
		} else {
			$('#pivotQuery').hide();
			$(this).text("Show query pane");
			$(this).css('width', '120px');
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
				setReducer(model, clickInformation);
				modifyItemDOM(model, 'sortField-' + clickInformation.fieldName, "Values");
				sendConfig(model);
				break;
			case "filter":
				if (clickInformation.filterWasApplied) {
					var newFilter = clickInformation.filter;
					setFilter(model, newFilter);
					modifyItemDOM(model, 'sortField-' + newFilter.name, "Filters");
					sendConfig(model);
				}
				break;
			default:
				break;
		}
	});
});
