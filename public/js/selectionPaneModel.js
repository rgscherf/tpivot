var data = (function () {
    var model = {};
    init();

    function init() {
        // Create intitial model state.
        this.model = {
            Columns: [],
            Rows: [],
            Filters: [],
            Values: []
        };
    }


    /////////////////////////////////
    // ADD/REMOVE FIELDS IN MODEL OBJ
    /////////////////////////////////

    function makeDefaultField(bucket, field) {
        var freshField = { name: field };
        switch (bucket) {
            case "Filters":
                freshField.filterOp = 'IN';
                freshField.filterExistence = true;
                freshField.filterVal = [];
                break;
            case "Values":
                freshField.reducer = "count";
                freshField.displayAs = "raw";
                break;
            default:
                break;
        }
        return freshField;
    }

    function addField(bucket, field) {
        var fieldAsObject = makeDefaultField(bucket, field);
        this.model[bucket].push(fieldAsObject);
    }

    function removeField(bucket, fieldFingerprint) {
        // Remove a field from given model bucket.
        this.model[bucket] = this.model[bucket].filter(function (elem) {
            return !(_.isEqual(elem, fieldFingerprint));
        });
    }


    ///////////////////////
    // MODIFY BUCKET FIELDS
    ///////////////////////

    function findFieldFromDomIndex(bucket, domIdx) {
        // get the field object matching a given bucket and index.
        var modelIdx = domIdx - 1 // There is an extra sibling at the start of sortable bucket containers.
        var retrieved = bucket[modelIdx];
        if (retrieved === undefined) {
            var errMsg = `Tried to find field object from bucket ${bucket} at index ${modelIdx} but failed. Bucket contents: ${this.model[bucket]}`;
            throw new Error(errMsg);
        } else {
            return retrieved;
        }
    }

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

    function getAggregator(idxOfFieldInDom) {
        // Retrieve an existing aggregator object.
        return findFieldFromDomIndex(this.model.Values, idxOfFieldInDom);
    }

    function setAggregator(aggregatorClickInformation) {
        // Modify an existing aggregator's value.
        // Check contextmenu.getAggregatorClickInformation to see the shape of the incoming reducer object.
        var reducerInModel = getAggregator.call(this, aggregatorClickInformation.clicked.index());

        var selectedReducer = aggregatorClickInformation.selectedReducer;
        var selectedDisplayAs = aggregatorClickInformation.selectedDisplayAs;
        if (selectedReducer) {
            reducerInModel.reducer = selectedReducer;
        }
        if (selectedDisplayAs) {
            reducerInModel.displayAs = selectedDisplayAs;
        }
    }

    function getFilter(filterIndexFromDom) {
        // Retrieve an existing filter object.
        return findFieldFromDomIndex(data.model.Filters, filterIndexFromDom);
        //return findFieldInBucket(data.model['Filters'], fieldName);
    }

    function setFilter(clickInformation) {
        // Modify an existing filter value. 
        // Check contextmenu.tryToApplyFilter to see the shape of the incoming filter object.
        var oldFilter = getFilter(clickInformation.clicked.index());
        oldFilter.filterExistence = clickInformation.filter.filterExistence;
        oldFilter.filterOp = clickInformation.filter.filterOp;
        oldFilter.filterVal = clickInformation.filter.filterVal;
    }

    function reorderItemsInBucket(bucket) {
        // Given a bucket name, rearrange entries in that bucket which match
        // the order of that bucket's DOM representation.
        var bucketOnModel = this.model[bucket];
        var bucketOnDom = $('[data-bucket="' + bucket + '"]');
        var bucketFingerprints = [];
        bucketOnDom
            .children()
            .filter('.fieldList__item--inBucket')
            .each(function (idx, elem) {
                bucketFingerprints.push($(elem).data('fieldFingerprint'));
            });
        this.model[bucket] = bucketFingerprints;
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
        model: model,
        init: init,
        makeDefaultField: makeDefaultField,
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