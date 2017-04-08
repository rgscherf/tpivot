<?php function getColSection($colName) {
    ob_start(); ?>
  <div class="selectionBucket">
    <div class="selectionHeader" style="margin: 5px 0px;font-size:1.5em;">
      <?php echo strtoupper($colName); ?>
    </div>
    <ul class="sortableList" id="<?php echo 'sortCol-'.$colName; ?>">
    </ul>
  </div>
  <?php return ob_get_clean();
}
?>

    <div id="selectionContainer" style="display:flex;flex-direction:column;">
      <div id="selectionPane">
        <div class="controlPanel">
          <div class="controlPanelItem">
            <div class="selectionHeader">
              1. Choose table
            </div>
            <div style="display:flex; align-items:center;">
              <div>
                <select id="tableSelector">
                  <?php foreach ($availableData as $tableName => $tableFields): ?>
                    <option value="<?php echo $tableName; ?>">
                      <?php echo $tableName; ?>
                    </option>
                    <?php endforeach; ?>
                </select>
              </div>
              <div style="margin-left: 5px">
                <button id="getTable">Get</button>
              </div>
            </div>
          </div>
          <div class="controlPanelItem">
            <div class="selectionHeader">
              2. Organize fields
            </div>
            <div>
              <ul class="sortableList" id="sortCol-noField">
              </ul>
            </div>
          </div>
          <div class="controlPanelItem">
            <div class="selectionHeader">
              3. Load pivot
            </div>
            <div>
              <button id="postConfig" style="margin-left: 10px">Render my pivot!</button>
            </div>
          </div>
        </div>
        <div class="selectionDivider">
          <div style="display:flex;width:100%;">
            <?php
echo getColSection("Filters");
echo getColSection("Columns");
?>
          </div>
          <div style="display:flex;width:100%;">
            <?php
echo getColSection("Rows");
echo getColSection("Values");
?>
          </div>
        </div>
      </div>
      <div id="selectionPaneShowHide">Hide query pane</div>
    </div>
    <script>
      var tableRequestURL = "<?php echo base_url('index.php/renderpivot/sendconfig'); ?>";
      var availableTables = <?php echo json_encode($availableData); ?>;
    </script>