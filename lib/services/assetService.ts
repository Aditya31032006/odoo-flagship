import { assetQueries } from "../queries/assetQueries";
import { query as defaultQuery } from "../db";
import { orgSetupQueries } from "../queries/orgSetupQueries";

export const assetService = {
  /**
   * Fetches assets with optional filters
   */
  async fetchAssets(search?: string, categoryId?: string, status?: string, departmentId?: string) {
    const res = await assetQueries.getAssets(search, categoryId, status, departmentId);
    return res.rows;
  },

  /**
   * Fetches dropdown values (categories, locations, departments)
   */
  async fetchSetupDropdowns() {
    const [categoriesRes, locationsRes, departmentsRes] = await Promise.all([
      orgSetupQueries.getCategories(),
      defaultQuery("SELECT id, name FROM locations ORDER BY name ASC"),
      orgSetupQueries.getDepartments()
    ]);

    return {
      categories: categoriesRes.rows.filter((c: any) => c.status === "ACTIVE"),
      locations: locationsRes.rows,
      departments: departmentsRes.rows.filter((d: any) => d.status === "ACTIVE")
    };
  },

  /**
   * Registers a new asset with auto-tagging, status log, and custom fields
   */
  async registerAsset(
    data: {
      name: string;
      description?: string;
      category_id: string;
      acquisition_date: string;
      acquisition_cost: string;
      expected_retirement_date?: string;
      current_condition: string;
      department_id?: string;
      location_id?: string;
      is_shared_bookable?: boolean;
      customFields?: Array<{ id: number; value: any; fieldType: string }>;
      documents?: Array<{ fileName: string; fileUrl: string; fileType: string; fileSize?: number }>;
    },
    createdByUserId: number
  ) {
    await defaultQuery("BEGIN");

    try {
      // 1. Resolve sequence number for tag (e.g. AF-0024)
      const seqRes = await assetQueries.getNextAssetTagSequence();
      const nextSeq = parseInt(seqRes.rows[0].next_val, 10);
      const paddedSeq = String(nextSeq).padStart(4, "0");
      const assetTag = `AF-${paddedSeq}`;

      // 2. Mock QR Code value and barcode value
      const qrCodeValue = `assetflow://lookup/${assetTag}`;
      const barcodeValue = `AF${paddedSeq}`;

      // 3. Create core asset
      const cost = parseFloat(data.acquisition_cost) || 0;
      const catId = parseInt(data.category_id, 10);
      const deptId = data.department_id ? parseInt(data.department_id, 10) : null;
      const locId = data.location_id ? parseInt(data.location_id, 10) : null;
      const isShared = data.is_shared_bookable || false;

      // Fetch category code
      const catRes = await defaultQuery("SELECT code FROM asset_categories WHERE id = $1", [catId]);
      const catCode = catRes.rows[0]?.code || "AST";

      // Fetch count of assets in this category
      const countRes = await defaultQuery("SELECT COUNT(*) AS total FROM assets WHERE category_id = $1", [catId]);
      const nextNum = parseInt(countRes.rows[0].total, 10) + 1;
      const serialNumber = `${catCode.toUpperCase()}-${String(nextNum).padStart(3, "0")}`;

      const assetRes = await assetQueries.createAsset(
        assetTag,
        data.name,
        data.description || "",
        catId,
        serialNumber,
        data.acquisition_date || null,
        cost,
        data.expected_retirement_date || null,
        "AVAILABLE", // Default starting status
        data.current_condition || "NEW",
        deptId,
        locId,
        isShared,
        qrCodeValue,
        barcodeValue,
        createdByUserId
      );

      const assetId = assetRes.rows[0].id;

      // 4. Log initial lifecycle status change
      await assetQueries.createAssetStatusHistory(
        assetId,
        "AVAILABLE", // from status
        "AVAILABLE", // to status
        "Initial asset registration setup",
        createdByUserId
      );

      // 5. Insert custom category fields values
      if (data.customFields && data.customFields.length > 0) {
        for (const cf of data.customFields) {
          const valStr = cf.value !== undefined ? String(cf.value) : null;
          const valNum = cf.fieldType === "NUMBER" ? parseFloat(cf.value) || null : null;
          const valDate = cf.fieldType === "DATE" ? cf.value || null : null;

          await assetQueries.insertAssetCustomFieldValue(
            assetId,
            cf.id,
            valStr,
            valNum,
            valDate
          );
        }
      }

      // 6. Insert support documents (photos, manuals)
      if (data.documents && data.documents.length > 0) {
        for (const doc of data.documents) {
          await assetQueries.insertAssetDocument(
            assetId,
            doc.fileName,
            doc.fileType,
            doc.fileUrl,
            doc.fileSize || 1024 * 500, // default 500KB
            createdByUserId
          );
        }
      }

      await defaultQuery("COMMIT");
      return { id: assetId, assetTag, name: data.name };
    } catch (error) {
      await defaultQuery("ROLLBACK");
      throw error;
    }
  },

  /**
   * Fetches comprehensive asset details alongside audit histories
   */
  async getAssetDetailsWithHistory(id: number) {
    const [detailsRes, docsRes, historyRes, maintRes, statusRes] = await Promise.all([
      assetQueries.getAssetDetails(id),
      assetQueries.getAssetDocuments(id),
      assetQueries.getAssetAllocationHistory(id),
      assetQueries.getAssetMaintenanceHistory(id),
      assetQueries.getAssetStatusHistory(id)
    ]);

    if (detailsRes.rows.length === 0) {
      throw new Error("Asset not found");
    }

    const assetDetails = detailsRes.rows[0];

    // Fetch category-specific dynamic custom fields
    const customFieldsRes = await assetQueries.getAssetCustomFieldsWithValues(
      id,
      assetDetails.category_id
    );

    return {
      details: assetDetails,
      customFields: customFieldsRes.rows,
      documents: docsRes.rows,
      allocations: historyRes.rows,
      maintenance: maintRes.rows,
      statusHistory: statusRes.rows
    };
  }
};
