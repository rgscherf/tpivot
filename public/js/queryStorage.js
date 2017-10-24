var queryStore = (function () {
    var currentLoaded = null;
    var QUERY_STORAGE_KEY = 'pivotStore';

    function unloadQuery() {
        currentLoaded = null;
        $('#loadedDocument').children().remove();
    }

    function attachLoadedData(loadData) {
        currentLoaded = loadData;
        $('#loadedDocument').children().remove();
        var loadString = "Currently modifying query with ID " + loadData.id;
        var loadDiv = $('<div>')
            .addClass('bg-info queryBuilder--marginLeft')
            .css({ 'border-radius': '2px', 'padding': '5px', 'display': 'inline-block' })
            .text(loadString)
            .appendTo($('#loadedDocument'));
    }

    function storage() {
        return window.localStorage;
    }

    function getStoredQueries() {
        var queries = JSON.parse(storage().getItem(QUERY_STORAGE_KEY));
        return (queries || []);
    }

    function appendToStorage(query) {
        var store = getStoredQueries();
        store.push(query);
        storage().setItem(QUERY_STORAGE_KEY, JSON.stringify(store));
    }

    function replaceStorage(queries) {
        storage().setItem(QUERY_STORAGE_KEY, JSON.stringify(queries));
    }

    function getTransformForSerialization() {
        // determine whether to save the transform.
        return pivotState.transformIsEmpty(pivotState.getCurrentTransform()) ? null : pivotState.getCurrentTransform();
    }

    function createQueryStorageObject(id, tableInfo, model) {
        return {
            id: id,
            date: (new Date()).toDateString(),
            db: tableInfo.db,
            owner: tableInfo.owner,
            table: tableInfo.table,
            model: model,
            transform: getTransformForSerialization()
        }
    }

    function updateQuery(currentTableInfo, model) {
        if (!currentLoaded) {
            console.log('Was asked to update a saved query with no query loaded!');
            return;
        }
        var transform = getTransformForSerialization();
        var id = currentLoaded.id;
        var storedQueriesWithoutThisId = getStoredQueries().filter(function (elem) {
            return elem.id !== id;
        });
        var newQuery = createQueryStorageObject(id, currentTableInfo, model);
        var allQueries = storedQueriesWithoutThisId.concat(newQuery);
        replaceStorage(allQueries);
        attachLoadedData(newQuery);
    }

    function saveQuery(currentTableInfo, model) {
        // determine ID for the new stored query
        var storedQueries = getStoredQueries();
        var newQueryId;
        if (storedQueries.length === 0) {
            newQueryId = 0;
        } else {
            var allIds = storedQueries.map(function (elem) { return elem.id });
            var maxId = Math.max.apply(null, allIds);
            newQueryId = maxId + 1;
        }

        // construct the storage object.
        var newQuery = createQueryStorageObject(newQueryId, currentTableInfo, model);
        appendToStorage(newQuery);
        attachLoadedData(newQuery);
    }

    function loadQueryFromModel(loadData) {
        $('#getTable').removeClass('btn-warning').addClass('btn-default');
        $('#dbSelector').val(loadData.db);
        var tableIdentifier = loadData.owner + "." + loadData.table;
        attachLoadedData(loadData);
        tpivot.removePivot();
        tchart.removeChart();
        view.switchToNewDb(loadData.db, tableIdentifier);
        view.switchToNewTable(tableIdentifier);
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

    function menuFromQueries(queries) {
        var container = $('<div class="loadMenu">');
        var d = $('<table>');
        var t = $('<tr class="queryBuilder--headerText">')
            .append($('<th>').text('ID'))
            .append($('<th>').text('Table Location'))
            .append($('<th>').text('Query Description'))
            .append($('<th>').text('Transformations'))
            .append($('<th>').text('Date Saved'))
            .appendTo(d);
        queries.forEach(function (elem) {
            var q = $('<tr>')
                .click(function (event) {
                    loadQueryFromModel(elem);
                    $('.loadQueryMenu').dialog("close");
                })
                .append($('<td>').text(elem.id))
                .append($('<td>').text(elem.db + "." + elem.owner + "." + elem.table))
                .append($('<td>').text(tutils.describeModel(elem.model)))
                .append($('<td>').text(tutils.describeTransform(elem.transform)))
                .append($('<td>').text(elem.date))
                .disableSelection();
            q.appendTo(d);
        });
        container
            .append(d);
        return container;
    }

    function loadQueryMenu() {
        var queries = getStoredQueries();
        var menuElement = menuFromQueries(queries);
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
                height: 'auto',
                width: 700,
                modal: true,
                title: 'Click to load a saved query',
                closeOnEscape: true
            })
            .addClass("loadQueryMenu");
    }

    return {
        saveQuery: saveQuery,
        loadQueryMenu: loadQueryMenu,
        unloadQuery: unloadQuery,
        updateQuery: updateQuery
    }
})();