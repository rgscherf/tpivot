<div id="pivotDiv" class="pivotDiv queryBuilder">
      <!--toolbar area-->
      <div class="toolbar__dummy">
      </div>
      <div class="toolbar queryBuilder__horizContainer queryBuilder__child--notSelectable">
        <?php echo buildSelectionVisibilityContainer(); ?>
        <?php echo buildStoredQueryContainer(); ?>
        <?php echo buildChartingControlsContainer(); ?>
        <?php echo buildLoadingContainer(); ?>
      </div>
      <div class="queryBuilder__horizContainer">
        <div class="selectionContainer queryBuilder__child--fields queryBuilder__child--notSelectable hideable">
          <!--field selector-->
          <?php echo buildSelectionTitle(); ?>
          <?php echo buildDatabaseSelector($availableDatabases); ?>
          <?php echo buildTableSelector(); ?>
          <?php echo buildListOfAllFields(); ?>
          <?php echo buildSortingBucket(); ?>
        </div>
        <div id="pivotContainer">
          <div id="loadedDocument">
          </div>
          <div id="pivotTarget">
          </div>
        </div>
      </div>
</div>

<script>
  var queryDistinctURL = "<?php echo base_url('index.php/renderpivot/getdistinct'); ?>";
  var queryProcessURL = "<?php echo base_url('index.php/renderpivot/processquery'); ?>";
  var queryColumnURL = "<?php echo base_url('index.php/renderpivot/getcolumns'); ?>";
  var getDbTables = "<?php echo base_url('index.php/renderpivot/gettables'); ?>";
  var getSavedQueriesURL = "<?php echo base_url('index.php/storage/queries'); ?>";
  var saveQueryURL = "<?php echo base_url('index.php/storage/save'); ?>";
</script>

<?php function buildSelectionVisibilityContainer() { ob_start(); ?>
  <div class="toolbar__section">
    <div class="toolbar__sectionButtons">
      <button type="button" id="selectionPaneShowHide" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-eye-slash" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel">
            Hide Builder              
          </div>
        </div>
      </button>
    </div>
    <div class="toolbar__sectionLabel">
      Visibility
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildChartingControlsContainer() { ob_start(); ?>
  <div class="toolbar__section">
    <div class="toolbar__sectionButtons">
      <button type="button" id="charting__showBar" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-bar-chart" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel">
            Bar Chart
          </div>
        </div>
      </button>
      <button type="button" id="charting__showLine" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-line-chart" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel">
            Line chart
          </div>
        </div>
      </button>
    </div>
    <div class="toolbar__sectionLabel">
      Charting
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildStoredQueryContainer() { ob_start(); ?>
  <div class="toolbar__section">
    <div class="toolbar__sectionButtons">
      <button type="button" id="storeQuery__load" class="btn btn-default">
      <div class="toolbar__button">
        <div>
          <i class="fa fa-2x fa-folder-open-o" aria-hidden="true"></i>
        </div>
        <div class="toolbar__buttonLabel">
          Load query
        </div>
      </div>
    </button>
      <button type="button" id="storeQuery__unload" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-trash-o" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel">
            Discard query
          </div>
        </div>
      </button>
      <button type="button" id="storeQuery__saveUpdate" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-floppy-o" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel">
            Save query
          </div>
        </div>
      </button>
      <button type="button" id="storeQuery__saveNew" class="btn btn-default">
        <div class="toolbar__button">
          <div>
            <span class="fa-stack">
              <i class="fa fa-floppy-o fa-stack-2x"></i>
              <i 
                class="fa fa-pencil fa-rotate-90 fa-stack-1x"   
                style="top:-10px;left:12px;">
              </i>
          </span>
          </div>
          <div class="toolbar__buttonLabel">
            Save new
          </div>
        </div>
      </button>
    </div>
    <div class="toolbar__sectionLabel">
      Storage
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildLoadingContainer() { ob_start(); ?>
  <div class="toolbar__section">
    <div class="toolbar__sectionButtons">
      <button type="button" id="loading__bypass" class="btn btn-default">
        <div class="toolbar__button">
          <div id="bypassIcon">
            <i class="fa fa-2x fa-cloud-upload" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel" id="bypassLabel">
            Sending Queries
          </div>
        </div>
      </button>
      <button type="button" id="loading__indicator" class="btn btn-default" disabled="disabled">
        <div class="toolbar__button">
          <div id="loadingSpinner">
            <i class="fa fa-2x fa-refresh" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel" id="loadingLabel">
            Awaiting Input
          </div>
        </div>
      </button>
      <button type="button" id="loading__stopLoad" class="btn btn-default" disabled="disabled">
        <div class="toolbar__button">
          <div>
            <i class="fa fa-2x fa-ban" aria-hidden="true"></i>
          </div>
          <div class="toolbar__buttonLabel" id="stopLoadLabel">
            Nothing Pending
          </div>
        </div>
      </button>
    </div>
    <div class="toolbar__sectionLabel">
      Server
    </div>
  </div>
<?php return ob_get_clean(); } ?>


<?php function buildSelectionTitle() { ob_start(); ?>
  <div class="selectionContainer__title">
    Pivot Table Fields
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildDatabaseSelector($availableDatabases) { ob_start(); ?>
  <div class="selectionContainer__section">
    <div class="selectionContainer__sectionLabel">
      Choose database:
    </div>
    <div class="queryBuilder--marginLeft queryBuilder--marginTop" style="display:flex; align-items:center;">
        <select id="dbSelector" style="flex-grow:1;">
          <?php foreach ($availableDatabases as $dbName): ?>
            <option value="<?php echo $dbName; ?>">
              <?php echo $dbName; ?>
            </option>
            <?php endforeach; ?>
        </select>
      <div style="margin-left: 10px">
        <button type="button" id="getDB" class="btn btn-default btn-sm">
          <div>
            <span style="margin-left:2px;">Load</span>
          </div>
        </button>
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>

<?php function buildtableselector() { ob_start(); ?>
  <div class="selectionContainer__section">
    <div class="selectionContainer__sectionLabel">
      Choose data source:
    </div>
    <div class="queryBuilder--marginLeft queryBuilder--marginTop" style="display:flex; align-items:center;">
        <select id="tableSelector" style="flex-grow:1;">
          <!-- <?php foreach ($availableData as $tablename => $tablefields): ?>
            <option value="<?php echo $tablename; ?>">
              <?php echo $tablename; ?>
            </option>
            <?php endforeach; ?> -->
        </select>
      <div style="margin-left: 10px">
        <button type="button" id="getTable" class="btn btn-default btn-sm">
          <div>
            <span style="margin-left:2px;">Load</span>
          </div>
        </button>
      </div>
    </div>
  </div>
<?php return ob_get_clean(); } ?>


<?php function buildListOfAllFields() { ob_start(); ?>
  <div id="queryTableFieldSelector" class="selectionContainer__section">
    <div class="selectionContainer__sectionLabel">
      Drag fields below to create query
    </div>
    <div id="tableColumns" class="queryBuilder__listOfAllFields queryBuilder--marginLeft queryBuilder--marginTop">
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
    <div>
      <i class="fa fa-fw <?php echo $thisIconText;?>" aria-hidden="true"></i>
      <span><?php echo strtoupper($bucketName); ?></span>
    </div>
  </div>
<?php return ob_get_clean();} ?>


<?php function buildSortingBucket() { ob_start(); ?>
  <div id="queryTableFieldSorter" class="selectionContainer__section">
    <div class="selectionContainer__sectionLabel">
      Right-click a Filter or Value for options.
    </div>
    <div class="queryBuilder--marginLeft queryBuilder--marginTop">
      <?php echo buildSortableBucketFieldContainer("Filters");
            echo buildSortableBucketFieldContainer("Columns");
            echo buildSortableBucketFieldContainer("Rows");
            echo buildSortableBucketFieldContainer("Values"); ?>
    </div>
  </div>
<?php return ob_get_clean(); } ?>