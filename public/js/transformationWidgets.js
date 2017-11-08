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
            .click(function (event) {
                createRenamingWidget(containingElement, sortingGroupId, rerenderTableFn);
            })
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
        return iconHolder;
    }

    function createAggregatorOverlay(containingElement, rowLabels, sortingGroupId, flexDirection, rerenderTableFn, sortByValueInfo) {
        var widgetContainer = createTranformWidgetOverlay(containingElement, rowLabels, sortingGroupId, flexDirection, rerenderTableFn);
        var sortWidget = $('<i class="fa fa-sort" aria-hidden="true"></i>')
            .click(function (event) {
                var newSortState = pivotState.handleValueSortClick(sortByValueInfo);
                rerenderTableFn();
            })
            .prependTo(widgetContainer);

    }

    function createRenamingWidget(containingElement, sortingGroupId, rerenderTableFn) {
        function doRename() {
            var field = sortingGroup[0];
            var fieldArray = sortingGroup[1];
            var fieldLabel = sortingGroup[3];
            var newLabel = $('#labelRename').val();
            pivotState.renameLabel(field, fieldArray, fieldLabel, newLabel);
            $('.labelRename').remove();
            rerenderTableFn();
        }
        var sortingGroup = sortingGroupId.split('__sortInfo__');
        var d = $('<div>')
            .addClass('table__sortWidget labelRename')
            .css({ 'align-items': 'center', 'padding': '10px' });
        var inp = $('<input>')
            .val(sortingGroup[3])
            .keypress(function (event) {
                var key = event.which;
                if (key === 13) {
                    event.preventDefault();
                    doRename();
                }
            })
            .css({ 'width': '150px', 'margin-right': '10px', 'height': '34px', 'padding': '5px' })
            .attr({ 'id': 'labelRename', 'type': 'text' });
        var ok = $('<button>')
            .addClass('btn btn-warning')
            .text('OK')
            .click(function (event) {
                doRename();
            });
        d.append(inp, ok).appendTo(containingElement);
        $('#labelRename').focus().select();
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
        var d = $('<div>')
            .addClass('table__sortWidget sortableRow sortingWidget')
            .sortable(makeSortableOptions(containingElement, (flexDirection === 'column' ? 'y' : 'x'), 'sortableRow', rerenderTableFn))
            .css({ 'flex-direction': flexDirection });
        rowLabels.forEach(function (label, idx) {
            var l = $('<div>')
                .css('margin', '5px')
                .text(label)
                .addClass('sortableValue')
                .data('group', sortingGroupId)
                .mouseenter(function (element) {
                })
                .appendTo(d);
        });
        d.appendTo(containingElement);
    }


    $(document).on('mousedown', function (event) {
        // Detecing 'closing' clicks for the label rename box and the label sorting box.
        // TODO: move the window.*ClickCount vars out of Window and into this module.

        // click detection for the rename box.
        if (!window.renamingClickCount) {
            window.renamingClickCount = 0;
        } else {
            window.renamingClickCount -= 1;
        }

        if ($('.labelRename').length > 0
            && $(event.target).closest('.labelRename').length === 0
            && window.renamingClickCount <= 0) {
            $('.labelRename').remove();
        }

        // click detection for the sorting box.
        if (!window.sortingClickCount) {
            window.sortingClickCount = 0;
        } else {
            window.sortingClickCount -= 1;
        }

        if ($('.sortingWidget').length > 0
            && $(event.target).closest('.sortingWidget').length === 0
            && window.sortingClickCount <= 0) {
            $('.sortingWidget').remove();
        }
    });

    return {
        createTranformWidgetOverlay: createTranformWidgetOverlay,
        createAggregatorOverlay: createAggregatorOverlay,
        destroyTransformWidgetOverlay: removeOverlay
    }
})();