var queryStore = (function () {
    var QUERY_STORAGE_KEY = 'pivotStore';

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

    function saveQuery(tableName, model) {
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

        // determine whether to save the transform.
        var transform = pivotState.transformIsEmpty(pivotState.getCurrentTransform()) ? null : pivotState.getCurrentTransform();

        // construct the storage object.
        var newQuery = {
            id: newQueryId,
            date: (new Date()).toDateString(),
            table: tableName,
            model: model,
            transform: transform
        };
        appendToStorage(newQuery);
    }

    function loadQueryFromModel(availableTables, loadData) {
        $('#getTable').removeClass('btn-warning').addClass('btn-default');
        $('#tableSelector').val(loadData.table);
        tpivot.removePivot();
        tchart.removeChart();
        view.resetState(availableTables[loadData.table]);
        data.model = loadData.model;
        var buckets = ["Values", "Filters", "Rows", "Columns"];
        buckets.forEach(function (buck) {
            var bucketarr = data.model[buck];
            bucketarr.forEach(function (elem) {
                addFieldToBucket(buck, elem.name);
            });
        });
        pivotState.setPendingTransform(loadData.transform);
        sendConfig();
    }

    function menuFromQueries(availableTables, queries) {
        var container = $('<div class="loadMenu">');
        var d = $('<table>');
        var t = $('<tr class="queryBuilder--headerText">')
            .append($('<th>').text('Table Name'))
            .append($('<th>').text('Query Description'))
            .append($('<th>').text('Transformations'))
            .append($('<th>').text('Date Saved'))
            .appendTo(d);
        queries.forEach(function (elem) {
            var q = $('<tr>')
                .click(function (event) {
                    loadQueryFromModel(availableTables, elem);
                    $('.loadQueryMenu').dialog("close");
                })
                .append($('<td>').text(elem.table))
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

    function loadQueryMenu(availableTables) {
        var queries = getStoredQueries();
        var menuElement = menuFromQueries(availableTables, queries);
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
        loadQueryMenu: loadQueryMenu
    }
})();