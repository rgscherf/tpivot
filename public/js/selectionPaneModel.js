var data = (function () {
    function copy(model) {
        return $.extend({}, model);
    }

    function init() {
        // Create intitial model state.
        return {
            Columns: [],
            Rows: [],
            Filters: [],
            Values: []
        };
    }


    /////////////////////////////////
    // ADD/REMOVE FIELDS IN MODEL OBJ
    /////////////////////////////////

    function addField(_model, bucket, field) {
        var model = copy(_model);
        var fieldAsObject = { name: field };
        switch (bucket) {
            case "Filters":
                fieldAsObject.filterExistence = true;
                fieldAsObject.filterOp = "less than";
                fieldAsObject.filterVal = "";
                break;
            case "Values":
                fieldAsObject.reducer = "count";
                fieldAsObject.displayAs = "raw";
                break;
            default:
                break;
        }
        model[bucket].push(fieldAsObject);
        return model;
    }

    function removeField(_model, bucket, field) {
        var model = copy(_model);
        model[bucket] = _model[bucket].filter(function (elem) {
            return elem.name != field;
        });
        return model;
    }


    ///////////////////////
    // MODIFY BUCKET FIELDS
    ///////////////////////

    function findFieldInBucket(bucket, fieldName) {
        // Given an array, find the (first) entry where elem.name == fieldName.
        // Private to this module.
        var ret = bucket.filter(function (elem) {
            return elem.name == fieldName;
        });
        if (ret.length == 0) {
            var errMsg = "Tried to find field " + fieldName + " in model bucket " + bucket + ", but it wasn't there.";
            throw new Error(errMsg);
        }
        else {
            return ret[0];
        }
    }

    function getAggregator(model, field) {
        // Retrieve an existing aggregator object.
        return findFieldInBucket(model.Values, field);
    }

    function setAggregator(_model, incomingReducer) {
        // Modify an existing aggregator's value. Returns a new model.
        // Check contextmenu.getAggregatorClickInformation to see the shape of the incoming reducer object.
        var model = copy(_model);
        var reducerInModel = getAggregator(model, incomingReducer.fieldName);

        var selectedReducer = incomingReducer.selectedReducer;
        var selectedDisplayAs = incomingReducer.selectedDisplayAs;
        if (selectedReducer) {
            reducerInModel.reducer = selectedReducer;
        }
        if (selectedDisplayAs) {
            reducerInModel.displayAs = selectedDisplayAs;
        }
        return model;
    }

    function getFilter(model, fieldName) {
        // Retrieve an existing filter object.
        return findFieldInBucket(model.Filters, fieldName);
    }

    function setFilter(_model, incomingFilter) {
        // Modify an existing filter value. Returns a new model.
        // Check contextmenu.tryToApplyFilter to see the shape of the incoming filter object.
        var model = copy(_model);
        var oldFilter = getFilter(model, incomingFilter.name);
        oldFilter.filterExistence = incomingFilter.filterExistence === 'is';
        oldFilter.filterOp = incomingFilter.filterOp;
        oldFilter.filterVal = incomingFilter.filterVal;
        return model;
    }

    function reorderItemsInBucket(_model, bucket) {
        // Given a bucket name, return a new model where entries in that bucket 
        // are sorted in the same order as that bucket's DOM representation.
        var model = copy(_model);
        var bucketOnModel = model[bucket];
        var bucketOnDom = $('[data-bucket="' + bucket + '"]');
        var domBucketChildNames = [];
        bucketOnDom
            .children()
            .filter('.fieldList__item--inBucket')
            .each(function (idx, elem) {
                domBucketChildNames.push(utils.textOf($(elem)));
            });
        var newBucketOnModel = [];
        domBucketChildNames.forEach(function (fieldName) {
            var modelChild = findFieldInBucket(bucketOnModel, fieldName);
            newBucketOnModel.push(modelChild);
        });
        model[bucket] = newBucketOnModel;
        return model;
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
                bucketChildrenNames.push(utils.textOf($(elem)));
            });

        if (bucketChildrenNames.length == 0) { return true; }
        else { return (bucketChildrenNames.indexOf(droppedFieldName) == -1); }
    }


    function canDropHere(container, droppedElement) {
        // Given a (bucket) container and a helper element, can we drop the element inside the bucket?
        // Must pass these tests:
        // - Container is a valid bucket.
        // - Element is not already in the bucket.
        // - If bucket is column/row, element does not already exist in rows/columns.
        if (!container) { return false; }
        if (!droppedElement.hasClass('field')) { return false; }
        var ret = true;
        // Check for duplicate fields, which are only allowed in Values
        if (container.data('bucket') !== 'Values') {
            container
                .children()
                .filter('.fieldList__item')
                .each(function (idx, elem) {
                    if (utils.textOf($(elem)) === utils.textOf(droppedElement)) {
                        ret = false;
                    }
                });
        }
        if (ret) {
            var bucket = container.data('bucket');
            switch (bucket) {
                case 'Rows':
                    ret = isOpposingBucketClear('Columns', utils.textOf(droppedElement));
                    break;
                case 'Columns':
                    ret = isOpposingBucketClear('Rows', utils.textOf(droppedElement));
                    break;
                default:
                    break;
            }
        }
        return ret;
    }


    return {
        init: init,
        addField: addField,
        removeField: removeField,
        getAggregator: getAggregator,
        setAggregator: setAggregator,
        getFilter: getFilter,
        setFilter: setFilter,
        reorderItemsInBucket: reorderItemsInBucket,
        canDropHere: canDropHere
    }
})();