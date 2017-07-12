var utils = (function () {
    var textOf = function (jqueryElement) {
        // Get the contents of a jq element's text node.
        return jqueryElement
            .contents()
            .get(0)
            .nodeValue;
    }

    return {
        textOf: textOf
    }
})();