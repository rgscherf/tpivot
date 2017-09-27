var twidgets = (function () {
    /////////////////////////////
    // SORTING ROW/COL/AGG LABELS
    /////////////////////////////

    // Options for defining sortable behavior of column headers.
    // This has two main behaviors:
    // 1. Where a field's labels repeat in the same row (because there is a field above in the hierarchy),
    // ... sorting is restricted to only the items underneath the same hierarchical header.
    // 2. When the user 'drops' an item, a transform is triggered and the table redraws
    // ... with all repetitions of the sorted field sorted as the user directed.

    // Identifying sort elements
    // In-group sorting is done by setting a data attribute on each header with the form:
    // data('group') = '(row | col | agg |)' + '__sortInfo__' + fieldIdx + '__sortInfo__' + sortingGroupNum
    // We can split this string on '__sortInfo__' to get individual pieces of data.
    // Call the split array SRT, and:
    // SRT[0] describes which meta field is being changed.
    // SRT[1] describes which index of the meta field is being changed. For rows and cols, this is a label array index.
    // ... for aggregators, this is just the name of the aggregator being sorted.
    // SRT[2] describes which iteration we're on for the meta field being changed. By finding all elements which 
    // ... match this part of the signature after sorting completes, we can build a list of field labels in the user's desired order.
    // SRT[3] is the element's label name.

    // need labels, sorting id, sorting num.
    function createTranformWidgetOverlay(containingElement, rowLabels, sortingGroupId, flexDirection, rerenderTableFn) {
        var iconHolder = $('<div>')
            .addClass('table__transformWidgetContainer');

        var sort = $('<i class="fa fa-arrows" aria-hidden="true"></i>')
            .click(function (event) {
                createSortWidget(containingElement, rowLabels, sortingGroupId, flexDirection, rerenderTableFn);
                removeOverlay();
            })
            .appendTo(iconHolder);

        var rename = $('<i class="fa fa-pencil-square-o" aria-hidden="true"></i>')
            .appendTo(iconHolder);

        var close = $('<i class="fa fa-window-close-o" aria-hidden="true"></i>')
            .click(function (event) {
                if (rowLabels.length > 1) {
                    removeElement(sortingGroupId, rerenderTableFn);
                }
            })
            .appendTo(iconHolder);

        iconHolder
            .appendTo(containingElement)
            .css({ 'top': '3px', 'right': '5px' });
    }

    function removeElement(sortingGroupId, rerenderTableFn) {
        var sortingGroupInfo = sortingGroupId.split('__sortInfo__');
        pivotState.removeHeader(sortingGroupInfo[0], sortingGroupInfo[1], sortingGroupInfo[3]);
        rerenderTableFn();
    }

    function removeOverlay() {
        $('.table__transformWidgetContainer').remove();
    }

    function makeSortableOptions(containingElement, axisDir, sortableClass, rerenderTableFn) {
        return {
            placeholder: "table__sortablePlaceholder",
            items: "> .sortableValue",
            helper: "clone",
            revert: 150,
            axis: axisDir,
            stop: function (event, ui) {
                var dat = ui.item.data('group');
                var labels = [];
                $(containingElement).find('.sortableValue').each(function (idx, elem) {
                    labels.push($(elem).text());
                });
                var direction = dat.split('__sortInfo__')[0];
                var index = dat.split('__sortInfo__')[1];
                pivotState.sortField(direction, index, labels);
                $('sortingWidget').remove();
                rerenderTableFn();
            }
        };
    }

    function createSortWidget(containingElement, rowLabels, sortingGroupId, flexDirection, rerenderTableFn) {
        window.sortingClickCount = 1;
        var d = $('<div>')
            .addClass('table__sortWidget sortableRow sortingWidget')
            .sortable(makeSortableOptions(containingElement, (flexDirection === 'column' ? 'y' : 'x'), 'sortableRow', rerenderTableFn))
            .css({
                'top': '5px',
                'right': '5px',
                'flex-direction': flexDirection
            });
        rowLabels.forEach(function (label, idx) {
            var l = $('<div>')
                .css('margin', '5px')
                .text(label)
                .addClass('sortableValue')
                .addClass(sortingGroupId)
                .data('group', sortingGroupId)
                .mouseenter(function (element) {
                })
                .appendTo(d);
        });
        d.appendTo(containingElement);
    }


    $(document).on('mousedown', function (event) {
        if (!window.sortingClickCount) {
            window.sortingClickCount = 0;
        } else {
            window.sortingClickCount -= 1;
        }

        if ($('.sortingWidget').length > 0
            && $(event.target).closest('.sortingWidget').length === 0
            && window.sortingClickCount <= 0) {
            $('.sortingWidget').remove();
            console.log('found click outside sort widget with widget open!');
        }
    });

    return {
        createTranformWidgetOverlay: createTranformWidgetOverlay,
        destroyTransformWidgetOverlay: removeOverlay
    }
})();