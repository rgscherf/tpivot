let values = ['hello', 'world'];
let rows = ['nb'];

let rowResults = [
    ['Namby', 1, false, 2, true, 3, false],
    ['Pamby', 4, false, 5, true, 6, false]
];

function deinterleaveFrom(guide, subject) {
    // Deinterleave a subject array into pieces of leng guide.length.
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

let r = rowResults.map(function (row) {
    let rowWithJustValues = row.slice(rows.length);
    return deinterleaveFrom(values, rowWithJustValues);
});

console.log(r);