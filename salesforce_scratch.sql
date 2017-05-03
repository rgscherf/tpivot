---------------
-- BASE QUERIES
---------------

SELECT * FROM SF_CASE
WHERE TRUNC(CREATEDDATE) >= TRUNC(SYSDATE)-90
AND ROWNUM <= 50000
ORDER BY CREATEDDATE DESC

SELECT * FROM SF_TASK
WHERE TRUNC(CREATEDDATE) >= TRUNC(SYSDATE)-90
AND ROWNUM <= 50000
ORDER BY CREATEDDATE DESC


----------------
-- A BASIC PIVOT
----------------

SELECT * FROM
(
    SELECT 
    CE_CASE_MGMT.SF_CASE.STATUS, 
    CE_CASE_MGMT.SF_CASE.ORIGIN, 
    CE_CASE_MGMT.SF_CASE.BRAND
    FROM CE_CASE_MGMT.SF_CASE
    WHERE TRUNC(CREATEDDATE) >= TRUNC(SYSDATE)-90 
    AND ROWNUM <= 50000
    AND STATUS = 'Open'
    ORDER BY CREATEDDATE DESC
)
pivot 
(
    count(STATUS)
    for BRAND in ('KOODO', 'TELUS')
);


--------------------------
-- LISTAGG for LIST UNIQUE
--------------------------

-- BASIC LISTAGG
SELECT
    BRAND,
    LISTAGG(ORIGIN, '; ') WITHIN GROUP (ORDER BY ORIGIN) ORIGINS
FROM (
   SELECT DISTINCT
    CE_CASE_MGMT.SF_CASE.BRAND,
    CE_CASE_MGMT.SF_CASE.ORIGIN
   FROM 
    CE_CASE_MGMT.SF_CASE 
)
GROUP BY
    BRAND;


-- LISTAGG WITH PIVOT

SELECT 
    * 
FROM (
    SELECT
        REASON,
        BRAND,
        LISTAGG(ORIGIN, '; ') WITHIN GROUP (ORDER BY ORIGIN) ORIGINS
    FROM (
            SELECT DISTINCT
                CE_CASE_MGMT.SF_CASE.BRAND,
                CE_CASE_MGMT.SF_CASE.REASON,
                CE_CASE_MGMT.SF_CASE.ORIGIN
            FROM 
                CE_CASE_MGMT.SF_CASE 
    )
    GROUP BY 
        REASON, BRAND
)
PIVOT (
    max(ORIGINS)
    FOR BRAND IN (q'[]', q'[KOODO]' AS KOODO, q'[TELUS]' AS TELUS)
);

-- So we need to add an inner SELECT DISTINCT for all selected cols
-- And rearrange the outer SELECT with only simple col names and and a LISTAGG on the List Unique column.
-- For the pivot value, do `max` (although it doesn't really matter) for the ALIASED col name. Probably just add an `S` onto the col name?