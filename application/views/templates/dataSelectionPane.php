<div id="pivotDiv">
  <div id="selectionPaneShowHide">
    Hide query pane
  </div>
  <div id="pivotAppContainer">
    <div>
      <div id="pivotQuery">
        <!--Table/Field selector-->
        <div id="queryTableFieldSelector">
          <div class="headerText">
            Data source
          </div>
          <div class="indent" style="display:flex; align-items:center;">
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
              <button id="getTable">Load</button>
            </div>
          </div>
          <div class="headerText">
            Drag fields below to create query.
          </div>
          <div class="indent">
            <ul class="sortableList" id="sortCol-noField">
            </ul>
          </div>
        </div>
        <!--Field sorting-->
        <div id="queryTableFieldSorter" style="padding-top: 5px;border-top:1px dashed #CDCDCD;">
          <div class="headerText indent">Right-click a Filter or Value for options.</div>
          <div id="fieldSorter">
            <div class="sorterRow" style="border-bottom: 1px solid #CDCDCD">
              <?php
echo getColSection("Filters");
echo getColSection("Columns", true);
?>
            </div>
            <div class="sorterRow">
              <?php
echo getColSection("Rows");
echo getColSection("Values", true);
?>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="pivotContainer">
      <div id="pivotTarget">
      </div>
    </div>
  </div>
</div>

<script>
  var tableRequestURL = "<?php echo base_url('index.php/renderpivot/sendconfig'); ?>";
  var availableTables = <?php echo json_encode($availableData); ?>;
</script>

<?php function getColSection($colName, $addLeftBorder=false) {
    $fontAwesomeDict = ["Filters" => "fa-filter", "Columns" => "fa-arrows-v", "Rows" => "fa-arrows-h", "Values" => "fa-cogs"];
    $thisIconText = $fontAwesomeDict[$colName];
    ob_start(); ?>
  <div class="selectionBucket" style="<?php if ($addLeftBorder) {echo 'border-left:1px solid #CDCDCD;';} ?>">
    <div class="headerText">
      <i class="fa <?php echo $thisIconText;?>" aria-hidden="true"></i>
      <span><?php echo strtoupper($colName); ?></span>
    </div>
    <ul class="sortableList" id="<?php echo 'sortCol-'.$colName; ?>">
    </ul>
  </div>
  <?php return ob_get_clean();
}
?>