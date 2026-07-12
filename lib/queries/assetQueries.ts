import { query as defaultQuery } from "../db";

const runQuery = (executor: any, text: string, params?: any[]) => {
  if (typeof executor === "function") {
    return executor(text, params);
  }
  return executor.query(text, params);
};

export const assetQueries = {
  /**
   * Fetches assets with optional search query and filters
   */
  async getAssets(
    search?: string,
    categoryId?: string,
    status?: string,
    departmentId?: string,
    executor: any = defaultQuery
  ) {
    let sql = `
      SELECT 
        a.id,
        a.asset_tag,
        a.name,
        a.current_status,
        c.name AS category_name,
        l.name AS location_name,
        d.name AS department_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (
        a.name ILIKE $${params.length} 
        OR a.asset_tag ILIKE $${params.length} 
        OR a.serial_number ILIKE $${params.length} 
        OR a.qr_code_value ILIKE $${params.length} 
      )`;
    }

    if (categoryId) {
      params.push(parseInt(categoryId, 10));
      sql += ` AND a.category_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND a.current_status = $${params.length}`;
    }

    if (departmentId) {
      params.push(parseInt(departmentId, 10));
      sql += ` AND a.department_id = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC`;

    return runQuery(executor, sql, params);
  },

  /**
   * Auto-generate tag sequence number
   */
  async getNextAssetTagSequence(executor: any = defaultQuery) {
    return runQuery(executor, `SELECT COALESCE(MAX(id), 0) + 1 AS next_val FROM assets`);
  },

  /**
   * Inserts asset record into assets table
   */
  async createAsset(
    assetTag: string,
    name: string,
    description: string,
    categoryId: number,
    serialNumber: string,
    acquisitionDate: string | null,
    acquisitionCost: number,
    expectedRetirementDate: string | null,
    currentStatus: string,
    currentCondition: string,
    departmentId: number | null,
    locationId: number | null,
    isSharedBookable: boolean,
    qrCodeValue: string,
    barcodeValue: string,
    createdBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO assets (
        asset_tag, name, description, category_id, serial_number,
        acquisition_date, acquisition_cost, expected_retirement_date, 
        current_status, current_condition, department_id, location_id, 
        is_shared_bookable, qr_code_value, barcode_value, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING id`,
      [
        assetTag, name, description, categoryId, serialNumber,
        acquisitionDate, acquisitionCost, expectedRetirementDate, 
        currentStatus, currentCondition, departmentId, locationId, 
        isSharedBookable, qrCodeValue, barcodeValue, createdBy
      ]
    );
  },

  /**
   * Logs status change in asset_status_history
   */
  async createAssetStatusHistory(
    assetId: number,
    fromStatus: string,
    toStatus: string,
    notes: string,
    changedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_status_history (asset_id, from_status, to_status, notes, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, fromStatus, toStatus, notes, changedBy]
    );
  },

  /**
   * Inserts asset custom category field value
   */
  async insertAssetCustomFieldValue(
    assetId: number,
    customFieldId: number,
    textValue: string | null,
    numberValue: number | null,
    dateValue: string | null,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_custom_field_values (asset_id, custom_field_id, text_value, number_value, date_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, customFieldId, textValue, numberValue, dateValue]
    );
  },

  /**
   * Inserts asset document attachment record
   */
  async insertAssetDocument(
    assetId: number,
    fileName: string,
    fileType: string,
    fileUrl: string,
    fileSize: number,
    uploadedBy: number,
    executor: any = defaultQuery
  ) {
    return runQuery(
      executor,
      `INSERT INTO asset_documents (asset_id, file_name, file_type, file_url, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [assetId, fileName, fileType, fileUrl, fileSize, uploadedBy]
    );
  },

  // ── Detail & History Queries ──────────────────────────────
  async getAssetDetails(id: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        a.*,
        c.name AS category_name,
        l.name AS location_name,
        d.name AS department_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN departments d ON a.department_id = d.id
      WHERE a.id = $1`,
      [id]
    );
  },

  async getAssetCustomFieldsWithValues(assetId: number, categoryId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT 
        cf.id AS custom_field_id,
        cf.name AS field_name,
        cf.field_type,
        cf.is_required,
        val.text_value,
        val.number_value,
        val.date_value
      FROM category_custom_fields cf
      LEFT JOIN asset_custom_field_values val ON val.custom_field_id = cf.id AND val.asset_id = $1
      WHERE cf.category_id = $2`,
      [assetId, categoryId]
    );
  },

  async getAssetDocuments(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT * FROM asset_documents WHERE asset_id = $1 ORDER BY created_at DESC`,
      [assetId]
    );
  },

  async getAssetAllocationHistory(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT aa.*, u.full_name as employee_name, d.name as department_name
       FROM asset_allocations aa
       LEFT JOIN users u ON aa.employee_id = u.id
       LEFT JOIN departments d ON aa.department_id = d.id
       WHERE aa.asset_id = $1
       ORDER BY aa.allocated_at DESC`,
      [assetId]
    );
  },

  async getAssetMaintenanceHistory(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT mr.*, u.full_name as technician_name
       FROM maintenance_requests mr
       LEFT JOIN users u ON mr.technician_user_id = u.id
       WHERE mr.asset_id = $1
       ORDER BY mr.created_at DESC`,
      [assetId]
    );
  },

  async getAssetStatusHistory(assetId: number, executor: any = defaultQuery) {
    return runQuery(
      executor,
      `SELECT ash.*, u.full_name as changed_by_name
       FROM asset_status_history ash
       LEFT JOIN users u ON ash.changed_by = u.id
       WHERE ash.asset_id = $1
       ORDER BY ash.created_at DESC`,
      [assetId]
    );
  }
};
