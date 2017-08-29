<div id="pivotDiv" class="pivotDiv">
  <div id="selectionPaneShowHide" class="selectionPaneShowHide queryBuilder__child--notSelectable">
    Hide query pane
  </div>
  <div id="pivotAppContainer">
    <div id="pivotQuery" class="queryBuilder">
      <!--toolbar area-->
      <div class="queryBuilder__horizContainer" style="min-height:87px;">
        <?php echo buildTableSelector($availableData); ?>
        <?php echo buildStoredQueryContainer(); ?>
        <?php echo buildChartingControlsContainer(); ?>
      </div>
      <div class="queryBuilder__horizContainer">
        <div class="queryBuilder__child queryBuilder__child--fields queryBuilder__child--notSelectable hideable">
          <!--field selector-->
          <?php echo buildListOfAllFields(); ?>
        </div>
        <div class="queryBuilder__child queryBuilder__child--notSelectable hideable">
          <!--Field sorting-->
          <?php echo buildSortingBucket(); ?>
          <?php echo buildLoadingPane(); ?>
        </div>
        <div id="pivotContainer" class="queryBuilder__child">
          <div id="pivotTarget">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
  var queryProcessURL = "<?php echo base_url('index.php/renderpivot/processquery'); ?>";
  var availableTables = <?php echo json_encode($availableData); ?>;
</script>

<?php function buildChartingControlsContainer() { ob_start(); ?>
  <div class="queryBuilder__child queryBuilder__child--notSelectable hideable">
    <div class="queryBuilder__spacer">
    </div>
    <div class="queryBuilder--headerText">
      Charting
    </div>
    <div class="queryBuilder--itemMargin" style="display:flex;align-items:center;">
      <div class="queryBuilder--indent" >
        <button id="charting__showBar" class="queryBuilder--alignInHoriz" style="width:100%" title="Save current pivot configuration so you can load it later with fresh data. The pivot configuration is the arrangement of table fields into Filters, Columns, Rows, and Values.">
          <i class="fa fa-fw fa-bar-chart" aria-hidden="true"></i>
          <span class="queryBuilder--indent">Show bar chart</span>
        </button>
      </div>
      <div class="queryBuilder--indent">
        <button id="charting__showLine" class="queryBuilder--alignInHoriz" style="width:100%" title="Load a previously-saved pivot configuration and construct a pivot table with fresh data.">
          <i class="fa fa-fw fa-line-chart" aria-hidden="true"></i>
          <span class="queryBuilder--indent">Show line chart</span>
        </button>
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildStoredQueryContainer() { ob_start(); ?>
  <div class="queryBuilder__child queryBuilder__child--notSelectable hideable">
    <div class="queryBuilder__spacer">
    </div>
    <div class="queryBuilder--headerText">
      Stored Queries
    </div>
    <div class="queryBuilder--itemMargin" style="display:flex;align-items:center;">
      <div class="queryBuilder--indent" >
        <button id="storeQuery__save" class="queryBuilder--alignInHoriz" style="width:100%" title="Save current pivot configuration so you can load it later with fresh data. The pivot configuration is the arrangement of table fields into Filters, Columns, Rows, and Values.">
          <i class="fa fa-fw fa-floppy-o" aria-hidden="true"></i>
          <span class="queryBuilder--indent">Save current query</span>
        </button>
      </div>
      <div class="queryBuilder--indent">
        <button id="storeQuery__load" class="queryBuilder--alignInHoriz" style="width:100%" title="Load a previously-saved pivot configuration and construct a pivot table with fresh data.">
          <i class="fa fa-fw fa-folder-open-o" aria-hidden="true"></i>
          <span class="queryBuilder--indent">Load saved query</span>
        </button>
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildtableselector($availableData) { ob_start(); ?>
  <div class="queryBuilder__child queryBuilder__child--notselectable hideable">
    <div class="queryBuilder__spacer">
    </div>
    <div class="queryBuilder--headerText">
      Data source
    </div>
    <div class="queryBuilder--indent queryBuilder--itemMargin" style="display:flex; align-items:center;">
      <div>
        <select id="tableSelector">
          <?php foreach ($availableData as $tablename => $tablefields): ?>
            <option value="<?php echo $tablename; ?>">
              <?php echo $tablename; ?>
            </option>
            <?php endforeach; ?>
        </select>
      </div>
      <div style="margin-left: 5px">
        <button id="getTable">Load</button>
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>


<?php function buildListOfAllFields() { ob_start(); ?>
  <div id="queryTableFieldSelector" class="queryBuilder__spacer">
    <div class="queryBuilder--headerText">
      Drag fields below to create query
    </div>
    <div id="tableColumns" class="queryBuilder__listOfAllFields queryBuilder--indent">
      <div class="tableColumnList" id="sortCol-noField">
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>


<?php function buildSortableBucketFieldContainer($bucketName) {
  $fontAwesomeDict = ["Filters" => "fa-filter", "Columns" => "fa-arrows-v", "Rows" => "fa-arrows-h", "Values" => "fa-cogs"];
  $thisIconText = $fontAwesomeDict[$bucketName];
  ob_start(); ?>
  <div class="sortingBucket__fieldContainer fieldReceiver" id="<?php echo 'sortCol-'.$bucketName; ?>" data-bucket="<?php echo $bucketName ?>">
    <div class="queryBuilder--headerText">
      <i class="fa fa-fw <?php echo $thisIconText;?>" aria-hidden="true"></i>
      <span class="sortingBucket--bold"><?php echo strtoupper($bucketName); ?></span>
    </div>
  </div>
<?php return ob_get_clean();} ?>


<?php function buildSortingBucket() { ob_start(); ?>
  <div id="queryTableFieldSorter">
    <div class="queryBuilder--headerText queryBuilder__spacer">Right-click a Filter or Value for options.</div>
    <div class="sortingBucket">
      <?php echo buildSortableBucketFieldContainer("Filters");
            echo buildSortableBucketFieldContainer("Columns");
            echo buildSortableBucketFieldContainer("Rows");
            echo buildSortableBucketFieldContainer("Values"); ?>
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildLoadingPane() { ob_start(); ?>
  <div id="loadingContainer">
  </div>
<?php return ob_get_clean(); } ?>