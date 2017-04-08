<h1 style="text-align: center;">T Pivot</h1>
<h2 style="text-align:center;">A partially completed prototype</h2>
<div class="preambleShowHide">Show the preamble</div>
<div id="preamble">
  <h2><a id="Instructions_2"></a>Instructions</h2>
  <ol>
    <li>From the query pane below, select a data source from the drop-down menu and click ‘Get’.</li>
    <li>Create your pivot table configuration. Drag fields into the filters/rows/columns/values area to specify where they should appear on the pivot table.</li>
    <li>Filters and Values require take input:
      <ol>
        <li>Filters: use the selection fields to express (is | is not) (predicate function) (user supplied value). Note the ‘has’ predicate, which looks for substrings. The input field currently requires that you press ENTER to confirm input.</li>
        <li>Values: use the dropdown to select an aggregator function for that field. Keep in mind which data types may work for your aggregator. For example, taking the average of a string field may not be useful.</li>
      </ol>
    </li>
    <li>When you’re happy with your layout, click ‘Render my pivot!’. It will appear below the query pane. You can click the ‘hide query pane’ area to get it out of the way.</li>
    <li>You can reset the pivot table at any time by clicking ‘Render my pivot!’ again. You can reset the position of the query fields by clicking ‘Get’.</li>
  </ol>
  <h2><a id="Requirements_tracker_12"></a>Requirements tracker</h2>
  <table class="table table-striped table-bordered">
    <thead>
      <tr>
        <th>Requirement</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Accept credentials from Oracle database</td>
        <td>NOT DONE</td>
        <td>Per Greg, not for prototype version. However, it’s simple to add tables/views.</td>
      </tr>
      <tr>
        <td>Display tables/views</td>
        <td>DONE</td>
        <td>In query pane.</td>
      </tr>
      <tr>
        <td>Populate pivot table with drag and drop</td>
        <td>DONE</td>
        <td>Query pane is built around drag-and-drop. Also possible on rendered pivot table.</td>
      </tr>
      <tr>
        <td>Aggregate values (e.g. count/sum/average for each row/column intersection)</td>
        <td>DONE</td>
        <td>Currently only one value at a time. See <em>Next Steps</em>.</td>
      </tr>
      <tr>
        <td>Show Values As (e.g. % of grand total, % of row total)</td>
        <td>NOT DONE</td>
        <td>See <em>Next Steps</em>.</td>
      </tr>
      <tr>
        <td>Report query changes back to server in real-time</td>
        <td>DONE</td>
        <td>Open the javascript console to see model changes being logged.</td>
      </tr>
    </tbody>
  </table>
  <h2><a id="Next_steps_23"></a>Next steps</h2>
  <ol>
    <li>First priority: view multiple values per row/column intersection of the pivot table. I have researched some forks of the pivot table library and determined that it should be possible to do this! My next goal is to investigate/implement.</li>
    <li>Second priority: Show Values As. This is somewhat tricky, as the library doesn’t differentiate between calculating aggregate values and displaying those values in relation to other cells. I will look at creating an elegant solution here. The brute-force
      alternative is providing a unique aggregation function for each combination of (aggregator * “show value as”)</li>
    <li>Question: the work described above mostly obviates the need for drag/drop functionality on the pivot table itself. <strong>Does it make sense to keep this in the pivot table, if more powerful drag/drop features are available in the query pane?</strong>      If not, we can drop back to a simpler version of the pivot table (same library) that doesn’t have drag and drop. This may make it simpler to do things like display multiple values per cell.</li>
  </ol>
  <p>That’s it! Let me know what you think so far.</p>
</div>
<div class="preambleShowHide">Show the preamble</div>