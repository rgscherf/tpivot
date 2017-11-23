var queryStore = (function () {
    var currentLoaded = null;
    var QUERY_STORAGE_KEY = 'pivotStore';
    var PLACEHOLDER_USER_STRING = 'temp_test_user';
    var SAVE_NEW_QUERY_EVENT = 'save_new';
    var UPDATE_QUERY_EVENT = 'save_update';

    function unloadQuery() {
        currentLoaded = null;
        $('#loadedDocument').children().remove();
    }

    function addLoadedDataTag(loadData) {
        // Add DOM element that says "you are currently editing query X"
        currentLoaded = loadData;
        $('#loadedDocument').children().remove();
        var loadString = "Currently modifying query " + loadData.name;
        var loadDiv = $('<div>')
            .addClass('bg-info queryBuilder--marginLeft')
            .css({ 'border-radius': '2px', 'padding': '5px', 'display': 'inline-block' })
            .text(loadString)
            .appendTo($('#loadedDocument'));
    }

    function getTransformForSerialization() {
        // determine whether to save the transform.
        return pivotState.transformIsEmpty(pivotState.getCurrentTransform()) ? null : pivotState.getCurrentTransform();
    }

    function sendQueryToStorage(tableInfo, model, name, eventType, id) {
        // Given a query and its metadata, send the query to be stored on server.
        // 'new' queries won't have an ID, so we'll send an undefined value. server handles this gracefully.
        var omnibusModel = {
            db: tableInfo.db,
            owner: tableInfo.owner,
            table: tableInfo.table,
            type: tableInfo.type,
            model: model
        }
        var payload = JSON.stringify({
            id: id,
            user: PLACEHOLDER_USER_STRING,
            event: eventType,
            queryName: name,
            omnibusModel: omnibusModel,
            transform: getTransformForSerialization()
        });

        $.ajax({
            type: "post",
            url: window.saveQueryURL,
            data: payload,
            success: function (saveInfo) {
                var saveResult = saveInfo[0];
                if (!saveResult) {
                    throw "Error saving query to DB. Stringified record I tried to save: " + payload;
                }
                var newLoaded = {
                    id: saveInfo[1],
                    db: tableInfo.db,
                    type: tableInfo.type,
                    owner: tableInfo.owner,
                    table: tableInfo.table,
                    model: model,
                    name: name
                }
                addLoadedDataTag(newLoaded);
            },
            error: function (x, stat, err) {
                console.log("AJAX REQUEST FAILED");
                console.log(x, stat, err);
            }
        });
    }

    function updateQuery(currentTableInfo, model) {
        if (!currentLoaded) {
            console.log('Was asked to update a saved query with no query loaded!');
            return;
        }
        var id = currentLoaded.id;
        var queryName = currentLoaded.name;
        sendQueryToStorage(currentTableInfo, model, queryName, UPDATE_QUERY_EVENT, id);
    }

    function createLabelNameWidget(containingElement, currentTableInfo, model) {
        // Create widget for saving a table name. 
        function saveQueryWithName() {
            var queryName = $('#queryNameInput').val();
            $('.queryNameContainer').remove();

            if (queryName === '') { return; }
            sendQueryToStorage(currentTableInfo, model, queryName, SAVE_NEW_QUERY_EVENT, null);
        }
        var d = $('<div>')
            .addClass('table__sortWidget queryNameContainer')
            .css({ 'align-items': 'center', 'padding': '10px' });
        var inp = $('<input>')
            .keydown(function (event) {
                var key = event.which;
                if (key === 32) {
                    event.preventDefault();
                    event.stopPropagation();
                    var queryNameInput = $('#queryNameInput');
                    queryNameInput.val(queryNameInput.val() + ' ');
                }
            })
            .keypress(function (event) {
                var key = event.which;
                if (key === 13) { // enter
                    event.preventDefault();
                    saveQueryWithName();
                }
            })
            .keyup(function (event) {
                var key = event.which;
                if (key === 27) { // esc
                    $('.queryNameContainer').remove();
                }
            })
            .click(function (event) {
                event.stopPropagation();
                $('#queryNameInput').focus();
            })
            .css({ 'width': '200px', 'margin-right': '10px', 'height': '34px', 'padding': '5px' })
            .attr({
                'id': 'queryNameInput',
                'type': 'text',
                'placeholder': 'Name this query. ESC cancels.'
            });
        var ok = $('<button>')
            .addClass('btn btn-warning')
            .text('OK')
            .click(function (event) {
                event.preventDefault();
                event.stopPropagation();
                saveQueryWithName();
            });
        d.append(inp, ok).appendTo(containingElement);
        $('#queryNameInput').focus().select();
    }

    function saveQuery(currentTableInfo, model) {
        createLabelNameWidget($('#storeQuery__saveNew'), currentTableInfo, model);
    }

    function whenTableIsLoaded(loadData) {
        // To be run when we're ready to load table data.
        return function () {
            data.model = loadData.model;
            var buckets = ["Values", "Filters", "Rows", "Columns"];
            buckets.forEach(function (buck) {
                var bucketarr = data.model[buck];
                bucketarr.forEach(function (elem) {
                    addFieldToBucket(buck, elem.name, elem);
                });
            });
            pivotState.setPendingTransform(loadData.transform);
            sendConfig();
        }
    }

    function loadQueryFromModel(loadData) {
        // After a saved query is selected for loading, orchestrate DOM and model changes to retrieve and display data.
        $('#getTable').removeClass('btn-warning').addClass('btn-default');
        $('#dbSelector').val(loadData.db);
        var tableIdentifier = loadData.type + ': ' + loadData.owner + "." + loadData.table;
        addLoadedDataTag(loadData);
        tpivot.removePivot();
        tchart.removeChart();
        view.switchToNewDb(loadData.db, tableIdentifier);
        // load some instructions to execute once table DOM is retrieved and instantiated.
        var runWhenTableLoaded = whenTableIsLoaded(loadData);
        view.switchToNewTable(tableIdentifier, runWhenTableLoaded);
    }

    function unpackReturnedQueries(queries) {
        // Unpack saved queries returned from the server.
        // The primary function is to lift tableData values out of the server's 'query' object
        // Into top-level fields on the client-side object.
        return queries.map(function (parsed) {
            return {
                db: parsed.omnibusModel.db,
                owner: parsed.omnibusModel.owner,
                table: parsed.omnibusModel.table,
                type: parsed.omnibusModel.type,
                id: parsed.id,
                model: parsed.omnibusModel.model,
                transform: parsed.transform,
                date: parsed.date,
                user: parsed.user,
                name: parsed.name
            };
        });
    }

    function loadQueriesIntoMenu(queries) {
        // Load saved queries (returned from the server) into the query menu.
        // Remove the spinner first.
        var d = $('.loadMenuTarget');
        d.children().remove();
        d.css('width', '100%');
        var t = $('<tr class="queryBuilder--headerText">')
            .append($('<th>').text('ID'))
            .append($('<th>').text('Name'))
            .append($('<th>').text('Table Location'))
            .append($('<th>').text('Date Saved'))
            .appendTo(d);
        queries.forEach(function (elem) {
            var q = $('<tr>')
                .click(function (event) {
                    loadQueryFromModel(elem);
                    $('.loadQueryMenu').dialog("close");
                })
                .append($('<td>').text(elem.id))
                .append($('<td>').text(elem.name))
                .append($('<td>').text(elem.db + "." + elem.owner + "." + elem.table + '(' + elem.type + ')'))
                .append($('<td>').text(elem.date))
                .disableSelection();
            q.appendTo(d);
        });
    }

    function menuFromQueries() {
        // Initialize the query menu with a spinner.
        var container = $('<div class="loadMenu">').css('width', '100%');
        var d = $('<table class="loadMenuTarget">')
            .append('<i class="fa fa-4x fa-refresh fa-spin" aria-hidden="true"></i>');
        container
            .append(d);
        return container;
    }

    function loadQueryMenu() {
        // Load the query menu from button click.
        // Show the menu and a spinner until results return from server.
        var menuElement = menuFromQueries();
        $(menuElement)
            .dialog({
                classes: {
                    "ui-dialog": "loadMenu__ui-dialog",
                    "ui-dialog-titlebar": "loadMenu__ui-dialog-titlebar",
                    "ui-dialog-title": "loadMenu__ui-dialog-title",
                    "ui-dialog-titlebar-close": "loadMenu__ui-dialog-close",
                    // "ui-dialog-content": "",
                },
                close: function (event, ui) {
                    $(this).dialog("destroy");
                },
                resizable: false,
                closeText: "",
                height: 500,
                width: 800,
                modal: true,
                title: 'Click to load a saved query',
                closeOnEscape: true
            })
            .addClass("loadQueryMenu");

        $.ajax({
            type: "get",
            url: window.getSavedQueriesURL,
            data: '',
            success: function (queries) {
                var unpacked = unpackReturnedQueries(queries);
                loadQueriesIntoMenu(unpacked);
            },
            error: function (x, stat, err) {
                console.log("AJAX REQUEST FAILED");
                console.log(x, stat, err);
            }
        });
    }

    return {
        saveQuery: saveQuery,
        loadQueryMenu: loadQueryMenu,
        unloadQuery: unloadQuery,
        updateQuery: updateQuery
    }
})();