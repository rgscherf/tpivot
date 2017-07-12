<div id="pivotDiv" class="pivotDiv">
  <div id="selectionPaneShowHide" class="selectionPaneShowHide">
    Hide query pane
  </div>
  <div id="pivotAppContainer">
    <div id="pivotQuery" class="queryBuilder">
      <!--table selector-->
      <?php echo buildTableSelector($availableData); ?>
      <div class="queryBuilder__horizContainer">
        <div class="queryBuilder__child queryBuilder__child--fields hideable">
          <!--field selector-->
          <?php echo buildListOfAllFields(); ?>
        </div>
        <div class="queryBuilder__child hideable">
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


<?php function buildTableSelector($availableData) { ob_start(); ?>
  <div class="queryBuilder__child hideable">
    <div class="queryBuilder--headerText">
      Data source
    </div>
    <div class="queryBuilder--indent" style="display:flex; align-items:center;">
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
      <i class="fa <?php echo $thisIconText;?>" aria-hidden="true"></i>
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