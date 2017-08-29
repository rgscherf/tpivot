var tutils = (function () {
    function describeModel(model) {
        // Return a string description of model.
        // e.g. "Count(ID); Rows: x, y; "
        var description = '';
        if (model['Values'].length > 0) {
            var vals = model['Values'];
            vals.forEach(function (elem, idx) {
                if (idx > 0) {
                    description += ", ";
                }
                description += "(" + elem.reducer + " of " + elem.name + ")";
            });
        }
        if (model['Rows'].length > 0) {
            description += " by ";
            var cols = model['Rows'];
            cols.forEach(function (elem, idx) {
                if (idx > 0) {
                    description += ", ";
                }
                description += elem.name;
            });
        }
        if (model['Columns'].length > 0) {
            description += " by ";
            var cols = model['Columns'];
            cols.forEach(function (elem, idx) {
                if (idx > 0) {
                    description += ", ";
                }
                description += elem.name;
            });
        }
        if (model['Filters'].length > 0) {
            description += "with filters.";
        }
        return description;
    }

    return {
        describeModel: describeModel
    };
})();