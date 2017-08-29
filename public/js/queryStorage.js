var queryStore = (function () {
    function storage() {
        return window.localStorage;
    }

    function getStoredQueries() {
        var queries = JSON.parse(storage().getItem('savedQueries'));
        return (queries || []);
    }

    function appendToStorage(query) {
        var store = getStoredQueries();
        store.push(query);
        storage().setItem('savedQueries', JSON.stringify(store));
    }

    function makeNewStorageKey() {
        var localLength = storage().length;
        var storageKey = 'model' + localLength.toString();
        return storageKey;
    }

    function saveQuery(table, model) {
        var queryTitle = makeNewStorageKey();
        var newQuery = {
            date: (new Date()).toDateString(),
            table: table,
            model: model
        };
        appendToStorage(newQuery);
    }

    function loadQueryFromModel(availableTables, newModel) {
        $('#tableSelector').val(newModel.table);
        tpivot.removePivot();
        tchart.removeChart();
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

    function menuFromQueries(availableTables, queries) {
        var container = $('<div class="loadMenu">');
        var d = $('<table>');
        var t = $('<tr class="queryBuilder--headerText">')
            .append($('<th>').text('table'))
            .append($('<th>').text('query'))
            .append($('<th>').text('saved on'))
            .appendTo(d);
        queries.forEach(function (elem) {
            var q = $('<tr>')
                .click(function (event) {
                    loadQueryFromModel(availableTables, elem);
                    $('.loadQueryMenu').dialog("close");
                })
                .append($('<td>').text(elem.table))
                .append($('<td>').text(tutils.describeModel(elem.model)))
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
                width: 600,
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