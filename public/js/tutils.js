var tutils = (function () {
    var closeButton = ['<div>', '<i class="fa fa-fw fa-window-close" aria-hidden="true"></i>', '</div>'].join('\n');

    function deinterleaveFrom(guide, subject) {
        // Deinterleave a subject array into pieces of length guide.length.
        // Returns an array of arrays, where array order corresponds to ordering of guide.
        let cycle = guide.length;
        let results = [];
        guide.forEach(function (_, guideIndex) {
            let valuesForThisGuideElem = subject.filter(function (_, subIndex) {
                return (subIndex + guideIndex) % cycle === 0;
            });
            results.push(valuesForThisGuideElem);
        });
        return results;
    }

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

    function cartesianProduct(arr) {
        return arr.reduce(function (a, b) {
            return a.map(function (x) {
                return b.map(function (y) {
                    return x.concat(y);
                })
            }).reduce(function (a, b) { return a.concat(b) }, [])
        }, [[]]);
    }

    function allMetaCoordinates(data) {
        return {
            rowCoords: cartesianProduct(data.meta.rows)
            , colCoords: cartesianProduct(data.meta.columns)
            , aggCoords: data.meta.aggregators
        }
    }

    function sortMetaCols(meta) {
        meta.columns.forEach(function (arr) {
            arr.sort(function (a, b) {
                if (a === 'null') {
                    return 1;
                } else if (b === 'null') {
                    return -1;
                } else if ($.isNumeric(a) && $.isNumeric(b)) {
                    return a > b ? 1 : -1;
                }
                else {
                    return a > b ? 1 : -1;
                }
            });
        });
    }

    return {
        closeButton: closeButton,
        describeModel: describeModel,
        deinterleaveFrom: deinterleaveFrom,
        cartesianProduct: cartesianProduct,
        allMetaCoordinates: allMetaCoordinates,
        sortMetaCols: sortMetaCols
    };
})();