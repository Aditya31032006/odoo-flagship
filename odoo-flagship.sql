-- =====================================================================
-- ASSETFLOW
-- Enterprise Asset & Resource Management System
-- PostgreSQL Database Schema
-- =====================================================================

BEGIN;

-- =====================================================================
-- EXTENSIONS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================================
-- ENUMS
-- =====================================================================

CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'ASSET_MANAGER',
    'DEPARTMENT_HEAD',
    'EMPLOYEE'
);

CREATE TYPE account_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);

CREATE TYPE department_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);

CREATE TYPE category_status AS ENUM (
    'ACTIVE',
    'INACTIVE'
);

CREATE TYPE custom_field_data_type AS ENUM (
    'TEXT',
    'NUMBER',
    'BOOLEAN',
    'DATE',
    'DATETIME',
    'SELECT',
    'MULTI_SELECT'
);

CREATE TYPE asset_status AS ENUM (
    'AVAILABLE',
    'ALLOCATED',
    'RESERVED',
    'UNDER_MAINTENANCE',
    'LOST',
    'RETIRED',
    'DISPOSED'
);

CREATE TYPE asset_condition AS ENUM (
    'NEW',
    'EXCELLENT',
    'GOOD',
    'FAIR',
    'DAMAGED',
    'UNUSABLE'
);

CREATE TYPE asset_holder_type AS ENUM (
    'EMPLOYEE',
    'DEPARTMENT'
);

CREATE TYPE allocation_status AS ENUM (
    'ACTIVE',
    'RETURN_REQUESTED',
    'TRANSFER_REQUESTED',
    'RETURNED',
    'TRANSFERRED',
    'CANCELLED'
);

CREATE TYPE return_request_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE transfer_request_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE booking_status AS ENUM (
    'UPCOMING',
    'ONGOING',
    'COMPLETED',
    'CANCELLED',
    'REJECTED'
);

CREATE TYPE booking_created_for_type AS ENUM (
    'EMPLOYEE',
    'DEPARTMENT'
);

CREATE TYPE maintenance_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

CREATE TYPE maintenance_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'TECHNICIAN_ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CANCELLED'
);

CREATE TYPE audit_cycle_status AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'IN_PROGRESS',
    'UNDER_REVIEW',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE audit_scope_type AS ENUM (
    'ORGANIZATION',
    'DEPARTMENT',
    'LOCATION',
    'CATEGORY'
);

CREATE TYPE audit_verification_status AS ENUM (
    'PENDING',
    'VERIFIED',
    'MISSING',
    'DAMAGED',
    'NOT_ACCESSIBLE'
);

CREATE TYPE discrepancy_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'RESOLVED',
    'REJECTED'
);

CREATE TYPE discrepancy_resolution AS ENUM (
    'NONE',
    'MARKED_LOST',
    'SENT_TO_MAINTENANCE',
    'RELOCATED',
    'RECORD_CORRECTED',
    'NO_ACTION_REQUIRED'
);

CREATE TYPE notification_type AS ENUM (
    'ASSET_ASSIGNED',
    'ASSET_RETURN_REQUESTED',
    'ASSET_RETURN_APPROVED',
    'ASSET_RETURN_REJECTED',
    'ASSET_TRANSFER_REQUESTED',
    'ASSET_TRANSFER_APPROVED',
    'ASSET_TRANSFER_REJECTED',
    'OVERDUE_RETURN',
    'UPCOMING_RETURN',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'BOOKING_REMINDER',
    'BOOKING_STARTED',
    'BOOKING_COMPLETED',
    'MAINTENANCE_REQUESTED',
    'MAINTENANCE_APPROVED',
    'MAINTENANCE_REJECTED',
    'TECHNICIAN_ASSIGNED',
    'MAINTENANCE_RESOLVED',
    'AUDIT_ASSIGNED',
    'AUDIT_STARTED',
    'AUDIT_DISCREPANCY',
    'AUDIT_CLOSED',
    'SYSTEM'
);

CREATE TYPE notification_priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

CREATE TYPE activity_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'ASSIGN',
    'ALLOCATE',
    'RETURN',
    'TRANSFER',
    'APPROVE',
    'REJECT',
    'CANCEL',
    'START',
    'COMPLETE',
    'RESOLVE',
    'VERIFY',
    'EXPORT',
    'PROMOTE',
    'DEACTIVATE'
);

CREATE TYPE attachment_entity_type AS ENUM (
    'ASSET',
    'MAINTENANCE_REQUEST',
    'RETURN_REQUEST',
    'TRANSFER_REQUEST',
    'AUDIT_ITEM',
    'AUDIT_DISCREPANCY'
);

CREATE TYPE reminder_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'CANCELLED'
);

-- =====================================================================
-- COMMON UPDATED_AT TRIGGER
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- =====================================================================
-- DEPARTMENTS
-- =====================================================================

CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,

    parent_department_id BIGINT,

    status department_status NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT departments_name_not_empty
        CHECK (BTRIM(name) <> ''),

    CONSTRAINT departments_code_not_empty
        CHECK (BTRIM(code) <> ''),

    CONSTRAINT departments_parent_fk
        FOREIGN KEY (parent_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE
);

CREATE INDEX departments_parent_idx
    ON departments(parent_department_id);

CREATE INDEX departments_status_idx
    ON departments(status);

CREATE INDEX departments_name_idx
    ON departments(LOWER(name));

CREATE TRIGGER departments_updated_at_trigger
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- USERS / EMPLOYEE DIRECTORY
-- =====================================================================


CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,

    employee_code VARCHAR(50) UNIQUE,

    full_name VARCHAR(150) NOT NULL,
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    phone_number VARCHAR(25),
    profile_image_url TEXT,

    department_id BIGINT,

    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    status account_status NOT NULL DEFAULT 'ACTIVE',

    job_title VARCHAR(150),
    joining_date DATE,

    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMPTZ,

    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,

    created_by BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_full_name_not_empty
        CHECK (BTRIM(full_name) <> ''),

    CONSTRAINT users_email_not_empty
        CHECK (BTRIM(email::TEXT) <> ''),

    CONSTRAINT users_department_fk
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT users_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX users_department_idx
    ON users(department_id);

CREATE INDEX users_role_idx
    ON users(role);

CREATE INDEX users_status_idx
    ON users(status);

CREATE INDEX users_department_role_idx
    ON users(department_id, role);

CREATE INDEX users_full_name_idx
    ON users(LOWER(full_name));

CREATE INDEX users_active_department_idx
    ON users(department_id)
    WHERE status = 'ACTIVE';

CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- DEPARTMENT HEAD ASSIGNMENTS
-- Supports current and historical department heads.
-- =====================================================================

CREATE TABLE department_head_assignments (
    id BIGSERIAL PRIMARY KEY,

    department_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ended_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    notes TEXT,

    CONSTRAINT department_head_department_fk
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT department_head_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT department_head_assigned_by_fk
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT department_head_date_check
        CHECK (ended_at IS NULL OR ended_at >= assigned_at)
);

CREATE UNIQUE INDEX one_active_head_per_department_idx
    ON department_head_assignments(department_id)
    WHERE is_active = TRUE;

CREATE INDEX department_head_user_idx
    ON department_head_assignments(user_id);

CREATE INDEX department_head_active_idx
    ON department_head_assignments(is_active);

-- =====================================================================
-- ROLE ASSIGNMENT HISTORY
-- =====================================================================

CREATE TABLE role_assignment_history (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    previous_role user_role NOT NULL,
    new_role user_role NOT NULL,

    changed_by BIGINT NOT NULL,
    reason TEXT,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT role_history_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT role_history_changed_by_fk
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT role_history_role_change_check
        CHECK (previous_role <> new_role)
);

CREATE INDEX role_history_user_idx
    ON role_assignment_history(user_id);

CREATE INDEX role_history_changed_by_idx
    ON role_assignment_history(changed_by);

CREATE INDEX role_history_changed_at_idx
    ON role_assignment_history(changed_at DESC);

-- =====================================================================
-- USER SESSIONS
-- =====================================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    refresh_token_hash TEXT NOT NULL UNIQUE,

    ip_address INET,
    user_agent TEXT,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_sessions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT session_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX user_sessions_user_idx
    ON user_sessions(user_id);

CREATE INDEX user_sessions_expiry_idx
    ON user_sessions(expires_at);

CREATE INDEX active_user_sessions_idx
    ON user_sessions(user_id, expires_at)
    WHERE revoked_at IS NULL;

-- =====================================================================
-- PASSWORD RESET TOKENS
-- =====================================================================

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id BIGINT NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT password_reset_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT password_reset_expiry_check
        CHECK (expires_at > created_at)
);

CREATE INDEX password_reset_user_idx
    ON password_reset_tokens(user_id);

CREATE INDEX password_reset_expiry_idx
    ON password_reset_tokens(expires_at);

-- =====================================================================
-- ASSET CATEGORIES
-- =====================================================================

CREATE TABLE asset_categories (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,

    description TEXT,
    icon_url TEXT,

    default_warranty_months INTEGER,
    default_maintenance_interval_days INTEGER,
    expected_useful_life_months INTEGER,

    status category_status NOT NULL DEFAULT 'ACTIVE',

    created_by BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT categories_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT category_name_not_empty
        CHECK (BTRIM(name) <> ''),

    CONSTRAINT category_code_not_empty
        CHECK (BTRIM(code) <> ''),

    CONSTRAINT category_warranty_check
        CHECK (
            default_warranty_months IS NULL
            OR default_warranty_months >= 0
        ),

    CONSTRAINT category_maintenance_interval_check
        CHECK (
            default_maintenance_interval_days IS NULL
            OR default_maintenance_interval_days > 0
        ),

    CONSTRAINT category_life_check
        CHECK (
            expected_useful_life_months IS NULL
            OR expected_useful_life_months > 0
        )
);

CREATE INDEX asset_categories_status_idx
    ON asset_categories(status);

CREATE INDEX asset_categories_name_idx
    ON asset_categories(LOWER(name));

CREATE TRIGGER asset_categories_updated_at_trigger
BEFORE UPDATE ON asset_categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- CATEGORY-SPECIFIC CUSTOM FIELD DEFINITIONS
-- Example:
-- Electronics -> RAM, CPU, Warranty
-- Vehicles    -> Registration Number, Fuel Type
-- =====================================================================

CREATE TABLE category_custom_fields (
    id BIGSERIAL PRIMARY KEY,

    category_id BIGINT NOT NULL,

    field_name VARCHAR(100) NOT NULL,
    field_key VARCHAR(100) NOT NULL,

    data_type custom_field_data_type NOT NULL,

    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable BOOLEAN NOT NULL DEFAULT FALSE,

    select_options JSONB,
    default_value JSONB,

    validation_rules JSONB,

    display_order INTEGER NOT NULL DEFAULT 0,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT category_custom_field_category_fk
        FOREIGN KEY (category_id)
        REFERENCES asset_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT category_custom_field_unique
        UNIQUE (category_id, field_key),

    CONSTRAINT category_custom_field_name_check
        CHECK (BTRIM(field_name) <> ''),

    CONSTRAINT category_custom_field_key_check
        CHECK (field_key ~ '^[a-z][a-z0-9_]*$'),

    CONSTRAINT category_custom_field_order_check
        CHECK (display_order >= 0),

    CONSTRAINT category_select_options_check
        CHECK (
            data_type NOT IN ('SELECT', 'MULTI_SELECT')
            OR select_options IS NOT NULL
        )
);

CREATE INDEX category_custom_fields_category_idx
    ON category_custom_fields(category_id);

CREATE INDEX category_custom_fields_active_idx
    ON category_custom_fields(category_id, is_active);

CREATE TRIGGER category_custom_fields_updated_at_trigger
BEFORE UPDATE ON category_custom_fields
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- LOCATIONS
-- =====================================================================

CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,

    address_line_1 TEXT,
    address_line_2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),

    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),

    parent_location_id BIGINT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_by BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT locations_parent_fk
        FOREIGN KEY (parent_location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT locations_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT location_name_not_empty
        CHECK (BTRIM(name) <> ''),

    CONSTRAINT location_latitude_check
        CHECK (
            latitude IS NULL
            OR latitude BETWEEN -90 AND 90
        ),

    CONSTRAINT location_longitude_check
        CHECK (
            longitude IS NULL
            OR longitude BETWEEN -180 AND 180
        )
);

CREATE INDEX locations_parent_idx
    ON locations(parent_location_id);

CREATE INDEX locations_active_idx
    ON locations(is_active);

CREATE INDEX locations_name_idx
    ON locations(LOWER(name));

CREATE TRIGGER locations_updated_at_trigger
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ASSET TAG SEQUENCE
-- =====================================================================

CREATE SEQUENCE asset_tag_sequence
START WITH 1
INCREMENT BY 1
MINVALUE 1;

-- =====================================================================
-- ASSETS
-- =====================================================================

CREATE TABLE assets (
    id BIGSERIAL PRIMARY KEY,

    asset_tag VARCHAR(30) NOT NULL UNIQUE,

    name VARCHAR(200) NOT NULL,
    description TEXT,

    category_id BIGINT NOT NULL,

    serial_number VARCHAR(150),

    acquisition_date DATE,
    acquisition_cost NUMERIC(15, 2),

    expected_retirement_date DATE,
    retired_at TIMESTAMPTZ,
    disposed_at TIMESTAMPTZ,

    current_status asset_status NOT NULL DEFAULT 'AVAILABLE',
    current_condition asset_condition NOT NULL DEFAULT 'GOOD',

    department_id BIGINT,
    location_id BIGINT,

    is_shared_bookable BOOLEAN NOT NULL DEFAULT FALSE,

    qr_code_value TEXT UNIQUE,
    barcode_value TEXT UNIQUE,

    primary_photo_url TEXT,

    custom_field_values JSONB NOT NULL DEFAULT '{}'::JSONB,

    last_audit_at TIMESTAMPTZ,
    next_maintenance_due_date DATE,

    created_by BIGINT NOT NULL,
    updated_by BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT assets_category_fk
        FOREIGN KEY (category_id)
        REFERENCES asset_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT assets_department_fk
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL,

    CONSTRAINT assets_location_fk
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE SET NULL,

    CONSTRAINT assets_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT assets_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_name_not_empty
        CHECK (BTRIM(name) <> ''),

    CONSTRAINT asset_cost_check
        CHECK (
            acquisition_cost IS NULL
            OR acquisition_cost >= 0
        ),

    CONSTRAINT asset_retirement_date_check
        CHECK (
            expected_retirement_date IS NULL
            OR acquisition_date IS NULL
            OR expected_retirement_date >= acquisition_date
        ),

    CONSTRAINT asset_custom_values_object_check
        CHECK (jsonb_typeof(custom_field_values) = 'object')
);

CREATE UNIQUE INDEX assets_serial_number_unique_idx
    ON assets(LOWER(serial_number))
    WHERE serial_number IS NOT NULL;

CREATE INDEX assets_category_idx
    ON assets(category_id);

CREATE INDEX assets_status_idx
    ON assets(current_status);

CREATE INDEX assets_condition_idx
    ON assets(current_condition);

CREATE INDEX assets_department_idx
    ON assets(department_id);

CREATE INDEX assets_location_idx
    ON assets(location_id);

CREATE INDEX assets_shared_bookable_idx
    ON assets(is_shared_bookable)
    WHERE is_shared_bookable = TRUE;

CREATE INDEX assets_category_status_idx
    ON assets(category_id, current_status);

CREATE INDEX assets_department_status_idx
    ON assets(department_id, current_status);

CREATE INDEX assets_location_status_idx
    ON assets(location_id, current_status);

CREATE INDEX assets_acquisition_date_idx
    ON assets(acquisition_date);

CREATE INDEX assets_maintenance_due_idx
    ON assets(next_maintenance_due_date);

CREATE INDEX assets_retirement_due_idx
    ON assets(expected_retirement_date);

CREATE INDEX assets_name_search_idx
    ON assets USING GIN (
        to_tsvector(
            'simple',
            COALESCE(name, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(asset_tag, '') || ' ' ||
            COALESCE(serial_number, '')
        )
    );

CREATE INDEX assets_custom_fields_gin_idx
    ON assets USING GIN(custom_field_values);

CREATE OR REPLACE FUNCTION generate_asset_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.asset_tag IS NULL OR BTRIM(NEW.asset_tag) = '' THEN
        NEW.asset_tag :=
            'AF-' || LPAD(nextval('asset_tag_sequence')::TEXT, 6, '0');
    END IF;

    IF NEW.qr_code_value IS NULL OR BTRIM(NEW.qr_code_value) = '' THEN
        NEW.qr_code_value := NEW.asset_tag;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER assets_generate_tag_trigger
BEFORE INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION generate_asset_tag();

CREATE TRIGGER assets_updated_at_trigger
BEFORE UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ASSET CUSTOM FIELD VALUES
-- Normalized storage for searching/reporting.
-- JSONB is also retained in assets for convenient API responses.
-- =====================================================================

CREATE TABLE asset_custom_field_values (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,
    custom_field_id BIGINT NOT NULL,

    text_value TEXT,
    number_value NUMERIC(20, 4),
    boolean_value BOOLEAN,
    date_value DATE,
    datetime_value TIMESTAMPTZ,
    json_value JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT asset_custom_value_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_custom_value_field_fk
        FOREIGN KEY (custom_field_id)
        REFERENCES category_custom_fields(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_custom_value_unique
        UNIQUE (asset_id, custom_field_id),

    CONSTRAINT asset_custom_value_one_value_check
        CHECK (
            num_nonnulls(
                text_value,
                number_value,
                boolean_value,
                date_value,
                datetime_value,
                json_value
            ) <= 1
        )
);

CREATE INDEX asset_custom_values_asset_idx
    ON asset_custom_field_values(asset_id);

CREATE INDEX asset_custom_values_field_idx
    ON asset_custom_field_values(custom_field_id);

CREATE INDEX asset_custom_values_text_idx
    ON asset_custom_field_values(LOWER(text_value))
    WHERE text_value IS NOT NULL;

CREATE INDEX asset_custom_values_number_idx
    ON asset_custom_field_values(number_value)
    WHERE number_value IS NOT NULL;

CREATE TRIGGER asset_custom_values_updated_at_trigger
BEFORE UPDATE ON asset_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ASSET DOCUMENTS / PHOTOS
-- =====================================================================

CREATE TABLE asset_documents (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,

    document_type VARCHAR(100),
    description TEXT,

    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT asset_documents_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_documents_uploaded_by_fk
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_document_file_size_check
        CHECK (
            file_size_bytes IS NULL
            OR file_size_bytes >= 0
        )
);

CREATE INDEX asset_documents_asset_idx
    ON asset_documents(asset_id);

CREATE INDEX asset_documents_type_idx
    ON asset_documents(document_type);

-- =====================================================================
-- ASSET LIFECYCLE / STATUS HISTORY
-- =====================================================================

CREATE TABLE asset_status_history (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,

    previous_status asset_status,
    new_status asset_status NOT NULL,

    previous_condition asset_condition,
    new_condition asset_condition,

    reason TEXT,

    related_entity_type VARCHAR(100),
    related_entity_id BIGINT,

    changed_by BIGINT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT asset_status_history_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_status_history_changed_by_fk
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX asset_status_history_asset_idx
    ON asset_status_history(asset_id, changed_at DESC);

CREATE INDEX asset_status_history_status_idx
    ON asset_status_history(new_status);

CREATE INDEX asset_status_history_related_idx
    ON asset_status_history(related_entity_type, related_entity_id);

CREATE OR REPLACE FUNCTION record_asset_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF
        OLD.current_status IS DISTINCT FROM NEW.current_status
        OR OLD.current_condition IS DISTINCT FROM NEW.current_condition
    THEN
        INSERT INTO asset_status_history (
            asset_id,
            previous_status,
            new_status,
            previous_condition,
            new_condition,
            reason,
            changed_by
        )
        VALUES (
            NEW.id,
            OLD.current_status,
            NEW.current_status,
            OLD.current_condition,
            NEW.current_condition,
            'Asset status or condition updated',
            NEW.updated_by
        );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER assets_status_history_trigger
AFTER UPDATE OF current_status, current_condition ON assets
FOR EACH ROW
EXECUTE FUNCTION record_asset_status_history();

-- =====================================================================
-- ASSET ALLOCATIONS
-- =====================================================================

CREATE TABLE asset_allocations (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,

    holder_type asset_holder_type NOT NULL,

    employee_id BIGINT,
    department_id BIGINT,

    allocated_by BIGINT NOT NULL,
    approved_by BIGINT,

    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_return_date DATE,

    actual_returned_at TIMESTAMPTZ,

    allocation_notes TEXT,

    checkout_condition asset_condition NOT NULL,
    checkout_condition_notes TEXT,

    checkin_condition asset_condition,
    checkin_condition_notes TEXT,

    status allocation_status NOT NULL DEFAULT 'ACTIVE',

    returned_to_location_id BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT asset_allocations_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_allocations_employee_fk
        FOREIGN KEY (employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_allocations_department_fk
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_allocations_allocated_by_fk
        FOREIGN KEY (allocated_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_allocations_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT asset_allocations_return_location_fk
        FOREIGN KEY (returned_to_location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT allocation_holder_check
        CHECK (
            (
                holder_type = 'EMPLOYEE'
                AND employee_id IS NOT NULL
                AND department_id IS NULL
            )
            OR
            (
                holder_type = 'DEPARTMENT'
                AND department_id IS NOT NULL
                AND employee_id IS NULL
            )
        ),

    CONSTRAINT allocation_expected_return_check
        CHECK (
            expected_return_date IS NULL
            OR expected_return_date >= allocated_at::DATE
        ),

    CONSTRAINT allocation_actual_return_check
        CHECK (
            actual_returned_at IS NULL
            OR actual_returned_at >= allocated_at
        )
);

CREATE UNIQUE INDEX one_open_allocation_per_asset_idx
    ON asset_allocations(asset_id)
    WHERE status IN (
        'ACTIVE',
        'RETURN_REQUESTED',
        'TRANSFER_REQUESTED'
    );

CREATE INDEX asset_allocations_asset_idx
    ON asset_allocations(asset_id, allocated_at DESC);

CREATE INDEX asset_allocations_employee_idx
    ON asset_allocations(employee_id);

CREATE INDEX asset_allocations_department_idx
    ON asset_allocations(department_id);

CREATE INDEX asset_allocations_status_idx
    ON asset_allocations(status);

CREATE INDEX asset_allocations_expected_return_idx
    ON asset_allocations(expected_return_date)
    WHERE status IN (
        'ACTIVE',
        'RETURN_REQUESTED',
        'TRANSFER_REQUESTED'
    );

CREATE INDEX asset_allocations_overdue_idx
    ON asset_allocations(expected_return_date, asset_id)
    WHERE
        status IN (
            'ACTIVE',
            'RETURN_REQUESTED',
            'TRANSFER_REQUESTED'
        )
        AND expected_return_date IS NOT NULL;

CREATE TRIGGER asset_allocations_updated_at_trigger
BEFORE UPDATE ON asset_allocations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- ALLOCATION VALIDATION
-- Blocks allocation when asset is already held or unavailable.
-- =====================================================================

CREATE OR REPLACE FUNCTION validate_asset_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_asset_status asset_status;
    current_holder_name TEXT;
BEGIN
    SELECT current_status
    INTO current_asset_status
    FROM assets
    WHERE id = NEW.asset_id
    FOR UPDATE;

    IF current_asset_status IS NULL THEN
        RAISE EXCEPTION 'Asset % does not exist.', NEW.asset_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM asset_allocations
        WHERE asset_id = NEW.asset_id
          AND status IN (
              'ACTIVE',
              'RETURN_REQUESTED',
              'TRANSFER_REQUESTED'
          )
    ) THEN
        SELECT
            CASE
                WHEN aa.employee_id IS NOT NULL THEN u.full_name
                WHEN aa.department_id IS NOT NULL THEN d.name
                ELSE 'Unknown holder'
            END
        INTO current_holder_name
        FROM asset_allocations aa
        LEFT JOIN users u
            ON u.id = aa.employee_id
        LEFT JOIN departments d
            ON d.id = aa.department_id
        WHERE aa.asset_id = NEW.asset_id
          AND aa.status IN (
              'ACTIVE',
              'RETURN_REQUESTED',
              'TRANSFER_REQUESTED'
          )
        ORDER BY aa.allocated_at DESC
        LIMIT 1;

        RAISE EXCEPTION
            'Asset is already allocated to %. Create a transfer request instead.',
            COALESCE(current_holder_name, 'another holder');
    END IF;

    IF current_asset_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION
            'Asset cannot be allocated because its current status is %.',
            current_asset_status;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_asset_allocation_trigger
BEFORE INSERT ON asset_allocations
FOR EACH ROW
EXECUTE FUNCTION validate_asset_allocation();

CREATE OR REPLACE FUNCTION sync_asset_after_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IN (
        'ACTIVE',
        'RETURN_REQUESTED',
        'TRANSFER_REQUESTED'
    ) THEN
        UPDATE assets
        SET
            current_status = 'ALLOCATED',
            department_id = CASE
                WHEN NEW.department_id IS NOT NULL
                    THEN NEW.department_id
                WHEN NEW.employee_id IS NOT NULL
                    THEN (
                        SELECT department_id
                        FROM users
                        WHERE id = NEW.employee_id
                    )
                ELSE department_id
            END,
            updated_by = NEW.allocated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.asset_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_asset_after_allocation_trigger
AFTER INSERT ON asset_allocations
FOR EACH ROW
EXECUTE FUNCTION sync_asset_after_allocation();

-- =====================================================================
-- ASSET RETURN REQUESTS
-- =====================================================================

CREATE TABLE asset_return_requests (
    id BIGSERIAL PRIMARY KEY,

    allocation_id BIGINT NOT NULL,

    requested_by BIGINT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reason TEXT,

    proposed_return_date DATE,

    status return_request_status NOT NULL DEFAULT 'REQUESTED',

    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    received_by BIGINT,
    received_at TIMESTAMPTZ,

    returned_location_id BIGINT,

    checkin_condition asset_condition,
    checkin_notes TEXT,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT return_request_allocation_fk
        FOREIGN KEY (allocation_id)
        REFERENCES asset_allocations(id)
        ON DELETE CASCADE,

    CONSTRAINT return_request_requested_by_fk
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT return_request_reviewed_by_fk
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT return_request_received_by_fk
        FOREIGN KEY (received_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT return_request_location_fk
        FOREIGN KEY (returned_location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT return_request_review_data_check
        CHECK (
            reviewed_at IS NULL
            OR reviewed_by IS NOT NULL
        ),

    CONSTRAINT return_request_received_data_check
        CHECK (
            received_at IS NULL
            OR received_by IS NOT NULL
        )
);

CREATE UNIQUE INDEX one_open_return_request_per_allocation_idx
    ON asset_return_requests(allocation_id)
    WHERE status IN ('REQUESTED', 'APPROVED');

CREATE INDEX return_requests_allocation_idx
    ON asset_return_requests(allocation_id);

CREATE INDEX return_requests_status_idx
    ON asset_return_requests(status);

CREATE INDEX return_requests_requested_by_idx
    ON asset_return_requests(requested_by);

CREATE INDEX return_requests_reviewed_by_idx
    ON asset_return_requests(reviewed_by);

CREATE TRIGGER return_requests_updated_at_trigger
BEFORE UPDATE ON asset_return_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION sync_return_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_asset_id BIGINT;
BEGIN
    SELECT asset_id
    INTO target_asset_id
    FROM asset_allocations
    WHERE id = NEW.allocation_id;

    IF TG_OP = 'INSERT' THEN
        UPDATE asset_allocations
        SET status = 'RETURN_REQUESTED'
        WHERE id = NEW.allocation_id
          AND status = 'ACTIVE';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
    THEN
        IF NEW.status = 'REJECTED' THEN
            UPDATE asset_allocations
            SET status = 'ACTIVE'
            WHERE id = NEW.allocation_id
              AND status = 'RETURN_REQUESTED';

        ELSIF NEW.status = 'CANCELLED' THEN
            UPDATE asset_allocations
            SET status = 'ACTIVE'
            WHERE id = NEW.allocation_id
              AND status = 'RETURN_REQUESTED';

        ELSIF NEW.status = 'COMPLETED' THEN
            IF NEW.checkin_condition IS NULL THEN
                RAISE EXCEPTION
                    'Check-in condition is required to complete a return.';
            END IF;

            UPDATE asset_allocations
            SET
                status = 'RETURNED',
                actual_returned_at = COALESCE(
                    NEW.received_at,
                    CURRENT_TIMESTAMP
                ),
                checkin_condition = NEW.checkin_condition,
                checkin_condition_notes = NEW.checkin_notes,
                returned_to_location_id = NEW.returned_location_id
            WHERE id = NEW.allocation_id;

            UPDATE assets
            SET
                current_status = CASE
                    WHEN NEW.checkin_condition IN ('DAMAGED', 'UNUSABLE')
                        THEN 'UNDER_MAINTENANCE'
                    ELSE 'AVAILABLE'
                END,
                current_condition = NEW.checkin_condition,
                location_id = COALESCE(
                    NEW.returned_location_id,
                    location_id
                ),
                updated_by = COALESCE(
                    NEW.received_by,
                    NEW.reviewed_by
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = target_asset_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_return_request_status_trigger
AFTER INSERT OR UPDATE OF status ON asset_return_requests
FOR EACH ROW
EXECUTE FUNCTION sync_return_request_status();

-- =====================================================================
-- ASSET TRANSFER REQUESTS
-- =====================================================================

CREATE TABLE asset_transfer_requests (
    id BIGSERIAL PRIMARY KEY,

    allocation_id BIGINT NOT NULL,

    from_employee_id BIGINT,
    from_department_id BIGINT,

    to_holder_type asset_holder_type NOT NULL,
    to_employee_id BIGINT,
    to_department_id BIGINT,

    requested_by BIGINT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reason TEXT,

    status transfer_request_status NOT NULL DEFAULT 'REQUESTED',

    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    completed_by BIGINT,
    completed_at TIMESTAMPTZ,

    new_allocation_id BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transfer_request_allocation_fk
        FOREIGN KEY (allocation_id)
        REFERENCES asset_allocations(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_from_employee_fk
        FOREIGN KEY (from_employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_from_department_fk
        FOREIGN KEY (from_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_to_employee_fk
        FOREIGN KEY (to_employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_to_department_fk
        FOREIGN KEY (to_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_requested_by_fk
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_reviewed_by_fk
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_completed_by_fk
        FOREIGN KEY (completed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_request_new_allocation_fk
        FOREIGN KEY (new_allocation_id)
        REFERENCES asset_allocations(id)
        ON DELETE CASCADE,

    CONSTRAINT transfer_destination_check
        CHECK (
            (
                to_holder_type = 'EMPLOYEE'
                AND to_employee_id IS NOT NULL
                AND to_department_id IS NULL
            )
            OR
            (
                to_holder_type = 'DEPARTMENT'
                AND to_department_id IS NOT NULL
                AND to_employee_id IS NULL
            )
        ),

    CONSTRAINT transfer_source_check
        CHECK (
            num_nonnulls(
                from_employee_id,
                from_department_id
            ) = 1
        )
);

CREATE UNIQUE INDEX one_open_transfer_request_per_allocation_idx
    ON asset_transfer_requests(allocation_id)
    WHERE status IN ('REQUESTED', 'APPROVED');

CREATE INDEX transfer_requests_allocation_idx
    ON asset_transfer_requests(allocation_id);

CREATE INDEX transfer_requests_status_idx
    ON asset_transfer_requests(status);

CREATE INDEX transfer_requests_requested_by_idx
    ON asset_transfer_requests(requested_by);

CREATE INDEX transfer_requests_destination_employee_idx
    ON asset_transfer_requests(to_employee_id);

CREATE INDEX transfer_requests_destination_department_idx
    ON asset_transfer_requests(to_department_id);

CREATE TRIGGER transfer_requests_updated_at_trigger
BEFORE UPDATE ON asset_transfer_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION prepare_transfer_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_allocation asset_allocations%ROWTYPE;
BEGIN
    SELECT *
    INTO current_allocation
    FROM asset_allocations
    WHERE id = NEW.allocation_id;

    IF current_allocation.id IS NULL THEN
        RAISE EXCEPTION 'Allocation does not exist.';
    END IF;

    IF current_allocation.status <> 'ACTIVE' THEN
        RAISE EXCEPTION
            'Only an active allocation can be transferred.';
    END IF;

    NEW.from_employee_id := current_allocation.employee_id;
    NEW.from_department_id := current_allocation.department_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER prepare_transfer_request_trigger
BEFORE INSERT ON asset_transfer_requests
FOR EACH ROW
EXECUTE FUNCTION prepare_transfer_request();

CREATE OR REPLACE FUNCTION sync_transfer_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    old_allocation asset_allocations%ROWTYPE;
    created_allocation_id BIGINT;
BEGIN
    SELECT *
    INTO old_allocation
    FROM asset_allocations
    WHERE id = NEW.allocation_id;

    IF TG_OP = 'INSERT' THEN
        UPDATE asset_allocations
        SET status = 'TRANSFER_REQUESTED'
        WHERE id = NEW.allocation_id
          AND status = 'ACTIVE';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status
    THEN
        IF NEW.status IN ('REJECTED', 'CANCELLED') THEN
            UPDATE asset_allocations
            SET status = 'ACTIVE'
            WHERE id = NEW.allocation_id
              AND status = 'TRANSFER_REQUESTED';

        ELSIF NEW.status = 'COMPLETED' THEN
            UPDATE asset_allocations
            SET
                status = 'TRANSFERRED',
                actual_returned_at = CURRENT_TIMESTAMP,
                checkin_condition = checkout_condition,
                checkin_condition_notes =
                    'Transferred to another holder'
            WHERE id = NEW.allocation_id;

            INSERT INTO asset_allocations (
                asset_id,
                holder_type,
                employee_id,
                department_id,
                allocated_by,
                approved_by,
                allocated_at,
                expected_return_date,
                allocation_notes,
                checkout_condition,
                checkout_condition_notes,
                status
            )
            VALUES (
                old_allocation.asset_id,
                NEW.to_holder_type,
                NEW.to_employee_id,
                NEW.to_department_id,
                COALESCE(NEW.completed_by, NEW.reviewed_by),
                NEW.reviewed_by,
                CURRENT_TIMESTAMP,
                old_allocation.expected_return_date,
                CONCAT(
                    'Created through transfer request #',
                    NEW.id,
                    '. ',
                    COALESCE(NEW.reason, '')
                ),
                old_allocation.checkout_condition,
                'Condition carried forward from previous allocation',
                'ACTIVE'
            )
            RETURNING id INTO created_allocation_id;

            UPDATE asset_transfer_requests
            SET new_allocation_id = created_allocation_id
            WHERE id = NEW.id;

            UPDATE assets
            SET
                current_status = 'ALLOCATED',
                department_id = CASE
                    WHEN NEW.to_department_id IS NOT NULL
                        THEN NEW.to_department_id
                    WHEN NEW.to_employee_id IS NOT NULL
                        THEN (
                            SELECT department_id
                            FROM users
                            WHERE id = NEW.to_employee_id
                        )
                    ELSE department_id
                END,
                updated_by = COALESCE(
                    NEW.completed_by,
                    NEW.reviewed_by
                ),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = old_allocation.asset_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_transfer_request_status_trigger
AFTER INSERT OR UPDATE OF status ON asset_transfer_requests
FOR EACH ROW
EXECUTE FUNCTION sync_transfer_request_status();

-- =====================================================================
-- RESOURCE BOOKINGS
-- =====================================================================

CREATE TABLE resource_bookings (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,

    booked_by BIGINT NOT NULL,

    created_for_type booking_created_for_type NOT NULL DEFAULT 'EMPLOYEE',
    created_for_employee_id BIGINT,
    created_for_department_id BIGINT,

    title VARCHAR(200) NOT NULL,
    purpose TEXT,

    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,

    status booking_status NOT NULL DEFAULT 'UPCOMING',

    reminder_minutes_before INTEGER NOT NULL DEFAULT 30,

    cancelled_by BIGINT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    rescheduled_from_booking_id BIGINT,

    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT bookings_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT bookings_booked_by_fk
        FOREIGN KEY (booked_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT bookings_created_for_employee_fk
        FOREIGN KEY (created_for_employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT bookings_created_for_department_fk
        FOREIGN KEY (created_for_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT bookings_cancelled_by_fk
        FOREIGN KEY (cancelled_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT bookings_rescheduled_from_fk
        FOREIGN KEY (rescheduled_from_booking_id)
        REFERENCES resource_bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT booking_title_not_empty
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT booking_time_check
        CHECK (end_at > start_at),

    CONSTRAINT booking_reminder_check
        CHECK (reminder_minutes_before >= 0),

    CONSTRAINT booking_created_for_check
        CHECK (
            (
                created_for_type = 'EMPLOYEE'
                AND created_for_employee_id IS NOT NULL
                AND created_for_department_id IS NULL
            )
            OR
            (
                created_for_type = 'DEPARTMENT'
                AND created_for_department_id IS NOT NULL
                AND created_for_employee_id IS NULL
            )
        ),

    CONSTRAINT booking_cancellation_check
        CHECK (
            status <> 'CANCELLED'
            OR cancelled_at IS NOT NULL
        ),

    EXCLUDE USING GIST (
        asset_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (
        status IN ('UPCOMING', 'ONGOING')
    )
);

CREATE INDEX resource_bookings_asset_idx
    ON resource_bookings(asset_id, start_at);

CREATE INDEX resource_bookings_booked_by_idx
    ON resource_bookings(booked_by);

CREATE INDEX resource_bookings_employee_idx
    ON resource_bookings(created_for_employee_id);

CREATE INDEX resource_bookings_department_idx
    ON resource_bookings(created_for_department_id);

CREATE INDEX resource_bookings_status_idx
    ON resource_bookings(status);

CREATE INDEX resource_bookings_time_idx
    ON resource_bookings(start_at, end_at);

CREATE INDEX resource_bookings_upcoming_idx
    ON resource_bookings(start_at)
    WHERE status = 'UPCOMING';

CREATE TRIGGER resource_bookings_updated_at_trigger
BEFORE UPDATE ON resource_bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_resource_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    bookable BOOLEAN;
    current_asset_status asset_status;
BEGIN
    SELECT
        is_shared_bookable,
        current_status
    INTO
        bookable,
        current_asset_status
    FROM assets
    WHERE id = NEW.asset_id;

    IF bookable IS NULL THEN
        RAISE EXCEPTION 'Asset does not exist.';
    END IF;

    IF bookable = FALSE THEN
        RAISE EXCEPTION
            'This asset is not enabled as a shared bookable resource.';
    END IF;

    IF current_asset_status IN (
        'UNDER_MAINTENANCE',
        'LOST',
        'RETIRED',
        'DISPOSED'
    ) THEN
        RAISE EXCEPTION
            'Asset cannot be booked because its status is %.',
            current_asset_status;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_resource_booking_trigger
BEFORE INSERT OR UPDATE OF asset_id, start_at, end_at, status
ON resource_bookings
FOR EACH ROW
EXECUTE FUNCTION validate_resource_booking();

CREATE OR REPLACE FUNCTION sync_asset_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'ONGOING' THEN
        UPDATE assets
        SET
            current_status = 'RESERVED',
            updated_by = NEW.booked_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.asset_id
          AND current_status = 'AVAILABLE';

    ELSIF NEW.status IN ('COMPLETED', 'CANCELLED') THEN
        UPDATE assets
        SET
            current_status = 'AVAILABLE',
            updated_by = COALESCE(NEW.cancelled_by, NEW.booked_by),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.asset_id
          AND current_status = 'RESERVED'
          AND NOT EXISTS (
              SELECT 1
              FROM resource_bookings rb
              WHERE rb.asset_id = NEW.asset_id
                AND rb.id <> NEW.id
                AND rb.status = 'ONGOING'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM asset_allocations aa
              WHERE aa.asset_id = NEW.asset_id
                AND aa.status IN (
                    'ACTIVE',
                    'RETURN_REQUESTED',
                    'TRANSFER_REQUESTED'
                )
          );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_asset_booking_status_trigger
AFTER INSERT OR UPDATE OF status ON resource_bookings
FOR EACH ROW
EXECUTE FUNCTION sync_asset_booking_status();

-- =====================================================================
-- BOOKING REMINDERS
-- =====================================================================

CREATE TABLE booking_reminders (
    id BIGSERIAL PRIMARY KEY,

    booking_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    scheduled_for TIMESTAMPTZ NOT NULL,

    status reminder_status NOT NULL DEFAULT 'PENDING',

    sent_at TIMESTAMPTZ,
    failure_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT booking_reminders_booking_fk
        FOREIGN KEY (booking_id)
        REFERENCES resource_bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT booking_reminders_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT booking_reminder_unique
        UNIQUE (booking_id, user_id, scheduled_for)
);

CREATE INDEX booking_reminders_status_time_idx
    ON booking_reminders(status, scheduled_for);

CREATE INDEX booking_reminders_booking_idx
    ON booking_reminders(booking_id);

-- =====================================================================
-- MAINTENANCE REQUESTS
-- =====================================================================

CREATE TABLE maintenance_requests (
    id BIGSERIAL PRIMARY KEY,

    request_number VARCHAR(40) NOT NULL UNIQUE,

    asset_id BIGINT NOT NULL,

    raised_by BIGINT NOT NULL,
    raised_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT NOT NULL,

    priority maintenance_priority NOT NULL DEFAULT 'MEDIUM',
    status maintenance_status NOT NULL DEFAULT 'PENDING',

    requested_service_date DATE,

    approved_by BIGINT,
    approved_at TIMESTAMPTZ,

    rejected_by BIGINT,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,

    assigned_technician_id BIGINT,
    assigned_by BIGINT,
    assigned_at TIMESTAMPTZ,

    started_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    resolution_notes TEXT,
    work_performed TEXT,

    maintenance_cost NUMERIC(15, 2),

    condition_before asset_condition,
    condition_after asset_condition,

    next_maintenance_due_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT maintenance_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_raised_by_fk
        FOREIGN KEY (raised_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_rejected_by_fk
        FOREIGN KEY (rejected_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_technician_fk
        FOREIGN KEY (assigned_technician_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_assigned_by_fk
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_title_not_empty
        CHECK (BTRIM(issue_title) <> ''),

    CONSTRAINT maintenance_description_not_empty
        CHECK (BTRIM(issue_description) <> ''),

    CONSTRAINT maintenance_cost_check
        CHECK (
            maintenance_cost IS NULL
            OR maintenance_cost >= 0
        ),

    CONSTRAINT maintenance_approval_check
        CHECK (
            status <> 'APPROVED'
            OR (
                approved_by IS NOT NULL
                AND approved_at IS NOT NULL
            )
        ),

    CONSTRAINT maintenance_rejection_check
        CHECK (
            status <> 'REJECTED'
            OR (
                rejected_by IS NOT NULL
                AND rejected_at IS NOT NULL
                AND rejection_reason IS NOT NULL
            )
        ),

    CONSTRAINT maintenance_technician_check
        CHECK (
            status NOT IN (
                'TECHNICIAN_ASSIGNED',
                'IN_PROGRESS',
                'RESOLVED'
            )
            OR assigned_technician_id IS NOT NULL
        )
);

CREATE SEQUENCE maintenance_request_sequence
START WITH 1
INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_maintenance_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.request_number IS NULL
       OR BTRIM(NEW.request_number) = ''
    THEN
        NEW.request_number :=
            'MR-' ||
            TO_CHAR(CURRENT_DATE, 'YYYY') ||
            '-' ||
            LPAD(
                nextval('maintenance_request_sequence')::TEXT,
                6,
                '0'
            );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER maintenance_request_number_trigger
BEFORE INSERT ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION generate_maintenance_request_number();

CREATE INDEX maintenance_requests_asset_idx
    ON maintenance_requests(asset_id, raised_at DESC);

CREATE INDEX maintenance_requests_status_idx
    ON maintenance_requests(status);

CREATE INDEX maintenance_requests_priority_idx
    ON maintenance_requests(priority);

CREATE INDEX maintenance_requests_raised_by_idx
    ON maintenance_requests(raised_by);

CREATE INDEX maintenance_requests_technician_idx
    ON maintenance_requests(assigned_technician_id);

CREATE INDEX maintenance_requests_active_idx
    ON maintenance_requests(asset_id, status)
    WHERE status IN (
        'PENDING',
        'APPROVED',
        'TECHNICIAN_ASSIGNED',
        'IN_PROGRESS'
    );

CREATE INDEX maintenance_requests_due_idx
    ON maintenance_requests(requested_service_date);

CREATE TRIGGER maintenance_requests_updated_at_trigger
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- MAINTENANCE STATUS HISTORY
-- =====================================================================

CREATE TABLE maintenance_status_history (
    id BIGSERIAL PRIMARY KEY,

    maintenance_request_id BIGINT NOT NULL,

    previous_status maintenance_status,
    new_status maintenance_status NOT NULL,

    comments TEXT,

    changed_by BIGINT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT maintenance_history_request_fk
        FOREIGN KEY (maintenance_request_id)
        REFERENCES maintenance_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_history_changed_by_fk
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX maintenance_status_history_request_idx
    ON maintenance_status_history(
        maintenance_request_id,
        changed_at DESC
    );

-- =====================================================================
-- MAINTENANCE WORK LOGS
-- =====================================================================

CREATE TABLE maintenance_work_logs (
    id BIGSERIAL PRIMARY KEY,

    maintenance_request_id BIGINT NOT NULL,
    technician_id BIGINT NOT NULL,

    work_date DATE NOT NULL DEFAULT CURRENT_DATE,

    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,

    work_description TEXT NOT NULL,

    parts_used JSONB NOT NULL DEFAULT '[]'::JSONB,
    cost NUMERIC(15, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT maintenance_work_request_fk
        FOREIGN KEY (maintenance_request_id)
        REFERENCES maintenance_requests(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_work_technician_fk
        FOREIGN KEY (technician_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT maintenance_work_time_check
        CHECK (
            ended_at IS NULL
            OR started_at IS NULL
            OR ended_at >= started_at
        ),

    CONSTRAINT maintenance_work_cost_check
        CHECK (cost >= 0),

    CONSTRAINT maintenance_parts_array_check
        CHECK (jsonb_typeof(parts_used) = 'array')
);

CREATE INDEX maintenance_work_logs_request_idx
    ON maintenance_work_logs(maintenance_request_id);

CREATE INDEX maintenance_work_logs_technician_idx
    ON maintenance_work_logs(technician_id);

CREATE INDEX maintenance_work_logs_date_idx
    ON maintenance_work_logs(work_date);

-- =====================================================================
-- MAINTENANCE WORKFLOW AND ASSET STATUS
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_maintenance_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    actor_id BIGINT;
    resulting_asset_status asset_status;
BEGIN
    actor_id := COALESCE(
        NEW.approved_by,
        NEW.rejected_by,
        NEW.assigned_by,
        NEW.assigned_technician_id,
        NEW.raised_by
    );

    IF TG_OP = 'INSERT' THEN
        INSERT INTO maintenance_status_history (
            maintenance_request_id,
            previous_status,
            new_status,
            comments,
            changed_by
        )
        VALUES (
            NEW.id,
            NULL,
            NEW.status,
            'Maintenance request created',
            NEW.raised_by
        );

        RETURN NEW;
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO maintenance_status_history (
            maintenance_request_id,
            previous_status,
            new_status,
            comments,
            changed_by
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            CASE NEW.status
                WHEN 'APPROVED'
                    THEN 'Maintenance request approved'
                WHEN 'REJECTED'
                    THEN NEW.rejection_reason
                WHEN 'TECHNICIAN_ASSIGNED'
                    THEN 'Technician assigned'
                WHEN 'IN_PROGRESS'
                    THEN 'Maintenance work started'
                WHEN 'RESOLVED'
                    THEN NEW.resolution_notes
                WHEN 'CANCELLED'
                    THEN 'Maintenance request cancelled'
                ELSE 'Maintenance status updated'
            END,
            actor_id
        );

        IF NEW.status IN (
            'APPROVED',
            'TECHNICIAN_ASSIGNED',
            'IN_PROGRESS'
        ) THEN
            UPDATE assets
            SET
                current_status = 'UNDER_MAINTENANCE',
                updated_by = actor_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.asset_id;

        ELSIF NEW.status = 'RESOLVED' THEN
            SELECT
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM asset_allocations aa
                        WHERE aa.asset_id = NEW.asset_id
                          AND aa.status IN (
                              'ACTIVE',
                              'RETURN_REQUESTED',
                              'TRANSFER_REQUESTED'
                          )
                    )
                    THEN 'ALLOCATED'::asset_status
                    ELSE 'AVAILABLE'::asset_status
                END
            INTO resulting_asset_status;

            UPDATE assets
            SET
                current_status = resulting_asset_status,
                current_condition = COALESCE(
                    NEW.condition_after,
                    current_condition
                ),
                next_maintenance_due_date =
                    NEW.next_maintenance_due_date,
                updated_by = actor_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.asset_id;

        ELSIF NEW.status IN ('REJECTED', 'CANCELLED') THEN
            IF NOT EXISTS (
                SELECT 1
                FROM maintenance_requests mr
                WHERE mr.asset_id = NEW.asset_id
                  AND mr.id <> NEW.id
                  AND mr.status IN (
                      'APPROVED',
                      'TECHNICIAN_ASSIGNED',
                      'IN_PROGRESS'
                  )
            ) THEN
                UPDATE assets
                SET
                    current_status = CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM asset_allocations aa
                            WHERE aa.asset_id = NEW.asset_id
                              AND aa.status IN (
                                  'ACTIVE',
                                  'RETURN_REQUESTED',
                                  'TRANSFER_REQUESTED'
                              )
                        )
                        THEN 'ALLOCATED'::asset_status
                        ELSE 'AVAILABLE'::asset_status
                    END,
                    updated_by = actor_id,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.asset_id
                  AND current_status = 'UNDER_MAINTENANCE';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER maintenance_status_change_trigger
AFTER INSERT OR UPDATE OF status ON maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION handle_maintenance_status_change();

-- =====================================================================
-- GENERIC ATTACHMENTS
-- =====================================================================

CREATE TABLE attachments (
    id BIGSERIAL PRIMARY KEY,

    entity_type attachment_entity_type NOT NULL,
    entity_id BIGINT NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,

    mime_type VARCHAR(100),
    file_size_bytes BIGINT,

    description TEXT,

    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT attachments_uploaded_by_fk
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT attachments_file_size_check
        CHECK (
            file_size_bytes IS NULL
            OR file_size_bytes >= 0
        )
);

CREATE INDEX attachments_entity_idx
    ON attachments(entity_type, entity_id);

CREATE INDEX attachments_uploaded_by_idx
    ON attachments(uploaded_by);

-- =====================================================================
-- AUDIT CYCLES
-- =====================================================================

CREATE TABLE audit_cycles (
    id BIGSERIAL PRIMARY KEY,

    audit_number VARCHAR(40) NOT NULL UNIQUE,

    title VARCHAR(200) NOT NULL,
    description TEXT,

    scope_type audit_scope_type NOT NULL,

    department_id BIGINT,
    location_id BIGINT,
    category_id BIGINT,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status audit_cycle_status NOT NULL DEFAULT 'DRAFT',

    created_by BIGINT NOT NULL,

    started_by BIGINT,
    started_at TIMESTAMPTZ,

    closed_by BIGINT,
    closed_at TIMESTAMPTZ,

    closure_notes TEXT,

    total_assets INTEGER NOT NULL DEFAULT 0,
    verified_assets INTEGER NOT NULL DEFAULT 0,
    missing_assets INTEGER NOT NULL DEFAULT 0,
    damaged_assets INTEGER NOT NULL DEFAULT 0,
    pending_assets INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_cycles_department_fk
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycles_location_fk
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycles_category_fk
        FOREIGN KEY (category_id)
        REFERENCES asset_categories(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycles_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycles_started_by_fk
        FOREIGN KEY (started_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycles_closed_by_fk
        FOREIGN KEY (closed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_cycle_date_check
        CHECK (end_date >= start_date),

    CONSTRAINT audit_scope_reference_check
        CHECK (
            (
                scope_type = 'ORGANIZATION'
                AND department_id IS NULL
                AND location_id IS NULL
                AND category_id IS NULL
            )
            OR
            (
                scope_type = 'DEPARTMENT'
                AND department_id IS NOT NULL
                AND location_id IS NULL
                AND category_id IS NULL
            )
            OR
            (
                scope_type = 'LOCATION'
                AND location_id IS NOT NULL
                AND department_id IS NULL
                AND category_id IS NULL
            )
            OR
            (
                scope_type = 'CATEGORY'
                AND category_id IS NOT NULL
                AND department_id IS NULL
                AND location_id IS NULL
            )
        ),

    CONSTRAINT audit_counts_check
        CHECK (
            total_assets >= 0
            AND verified_assets >= 0
            AND missing_assets >= 0
            AND damaged_assets >= 0
            AND pending_assets >= 0
        )
);

CREATE SEQUENCE audit_cycle_sequence
START WITH 1
INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_audit_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.audit_number IS NULL
       OR BTRIM(NEW.audit_number) = ''
    THEN
        NEW.audit_number :=
            'AUD-' ||
            TO_CHAR(CURRENT_DATE, 'YYYY') ||
            '-' ||
            LPAD(
                nextval('audit_cycle_sequence')::TEXT,
                6,
                '0'
            );
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_cycle_number_trigger
BEFORE INSERT ON audit_cycles
FOR EACH ROW
EXECUTE FUNCTION generate_audit_number();

CREATE INDEX audit_cycles_status_idx
    ON audit_cycles(status);

CREATE INDEX audit_cycles_date_idx
    ON audit_cycles(start_date, end_date);

CREATE INDEX audit_cycles_department_idx
    ON audit_cycles(department_id);

CREATE INDEX audit_cycles_location_idx
    ON audit_cycles(location_id);

CREATE INDEX audit_cycles_category_idx
    ON audit_cycles(category_id);

CREATE TRIGGER audit_cycles_updated_at_trigger
BEFORE UPDATE ON audit_cycles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- AUDITORS ASSIGNED TO AUDIT CYCLES
-- =====================================================================

CREATE TABLE audit_cycle_auditors (
    id BIGSERIAL PRIMARY KEY,

    audit_cycle_id BIGINT NOT NULL,
    auditor_id BIGINT NOT NULL,

    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    is_lead_auditor BOOLEAN NOT NULL DEFAULT FALSE,

    completed_at TIMESTAMPTZ,

    CONSTRAINT audit_auditors_cycle_fk
        FOREIGN KEY (audit_cycle_id)
        REFERENCES audit_cycles(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_auditors_auditor_fk
        FOREIGN KEY (auditor_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_auditors_assigned_by_fk
        FOREIGN KEY (assigned_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_auditor_unique
        UNIQUE (audit_cycle_id, auditor_id)
);

CREATE INDEX audit_cycle_auditors_cycle_idx
    ON audit_cycle_auditors(audit_cycle_id);

CREATE INDEX audit_cycle_auditors_user_idx
    ON audit_cycle_auditors(auditor_id);

CREATE UNIQUE INDEX one_lead_auditor_per_cycle_idx
    ON audit_cycle_auditors(audit_cycle_id)
    WHERE is_lead_auditor = TRUE;

-- =====================================================================
-- AUDIT ITEMS
-- Each asset included in an audit cycle.
-- =====================================================================

CREATE TABLE audit_items (
    id BIGSERIAL PRIMARY KEY,

    audit_cycle_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,

    assigned_auditor_id BIGINT,

    verification_status audit_verification_status
        NOT NULL DEFAULT 'PENDING',

    expected_location_id BIGINT,
    observed_location_id BIGINT,

    expected_department_id BIGINT,
    observed_department_id BIGINT,

    expected_holder_employee_id BIGINT,
    observed_holder_employee_id BIGINT,

    expected_condition asset_condition,
    observed_condition asset_condition,

    verification_notes TEXT,

    verified_by BIGINT,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_items_cycle_fk
        FOREIGN KEY (audit_cycle_id)
        REFERENCES audit_cycles(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_assigned_auditor_fk
        FOREIGN KEY (assigned_auditor_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_expected_location_fk
        FOREIGN KEY (expected_location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_observed_location_fk
        FOREIGN KEY (observed_location_id)
        REFERENCES locations(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_expected_department_fk
        FOREIGN KEY (expected_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_observed_department_fk
        FOREIGN KEY (observed_department_id)
        REFERENCES departments(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_expected_holder_fk
        FOREIGN KEY (expected_holder_employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_observed_holder_fk
        FOREIGN KEY (observed_holder_employee_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_items_verified_by_fk
        FOREIGN KEY (verified_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_item_unique
        UNIQUE (audit_cycle_id, asset_id),

    CONSTRAINT audit_item_verification_check
        CHECK (
            verification_status = 'PENDING'
            OR (
                verified_by IS NOT NULL
                AND verified_at IS NOT NULL
            )
        )
);

CREATE INDEX audit_items_cycle_idx
    ON audit_items(audit_cycle_id);

CREATE INDEX audit_items_asset_idx
    ON audit_items(asset_id);

CREATE INDEX audit_items_status_idx
    ON audit_items(verification_status);

CREATE INDEX audit_items_auditor_idx
    ON audit_items(assigned_auditor_id);

CREATE TRIGGER audit_items_updated_at_trigger
BEFORE UPDATE ON audit_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- AUDIT DISCREPANCIES
-- =====================================================================

CREATE TABLE audit_discrepancies (
    id BIGSERIAL PRIMARY KEY,

    audit_cycle_id BIGINT NOT NULL,
    audit_item_id BIGINT NOT NULL,
    asset_id BIGINT NOT NULL,

    discrepancy_type audit_verification_status NOT NULL,

    description TEXT NOT NULL,

    status discrepancy_status NOT NULL DEFAULT 'OPEN',
    resolution discrepancy_resolution NOT NULL DEFAULT 'NONE',

    reported_by BIGINT NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,

    resolved_by BIGINT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT audit_discrepancies_cycle_fk
        FOREIGN KEY (audit_cycle_id)
        REFERENCES audit_cycles(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancies_item_fk
        FOREIGN KEY (audit_item_id)
        REFERENCES audit_items(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancies_asset_fk
        FOREIGN KEY (asset_id)
        REFERENCES assets(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancies_reported_by_fk
        FOREIGN KEY (reported_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancies_reviewed_by_fk
        FOREIGN KEY (reviewed_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancies_resolved_by_fk
        FOREIGN KEY (resolved_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT audit_discrepancy_type_check
        CHECK (
            discrepancy_type IN (
                'MISSING',
                'DAMAGED',
                'NOT_ACCESSIBLE'
            )
        ),

    CONSTRAINT audit_discrepancy_unique
        UNIQUE (audit_item_id),

    CONSTRAINT audit_discrepancy_resolution_check
        CHECK (
            status <> 'RESOLVED'
            OR (
                resolution <> 'NONE'
                AND resolved_by IS NOT NULL
                AND resolved_at IS NOT NULL
            )
        )
);

CREATE INDEX audit_discrepancies_cycle_idx
    ON audit_discrepancies(audit_cycle_id);

CREATE INDEX audit_discrepancies_asset_idx
    ON audit_discrepancies(asset_id);

CREATE INDEX audit_discrepancies_status_idx
    ON audit_discrepancies(status);

CREATE INDEX audit_discrepancies_type_idx
    ON audit_discrepancies(discrepancy_type);

CREATE TRIGGER audit_discrepancies_updated_at_trigger
BEFORE UPDATE ON audit_discrepancies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- AUTOMATIC AUDIT DISCREPANCY CREATION
-- =====================================================================

CREATE OR REPLACE FUNCTION handle_audit_item_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status
       AND NEW.verification_status <> 'PENDING'
    THEN
        UPDATE assets
        SET
            last_audit_at = NEW.verified_at,
            updated_by = NEW.verified_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.asset_id;

        IF NEW.verification_status IN (
            'MISSING',
            'DAMAGED',
            'NOT_ACCESSIBLE'
        ) THEN
            INSERT INTO audit_discrepancies (
                audit_cycle_id,
                audit_item_id,
                asset_id,
                discrepancy_type,
                description,
                reported_by
            )
            VALUES (
                NEW.audit_cycle_id,
                NEW.id,
                NEW.asset_id,
                NEW.verification_status,
                COALESCE(
                    NEW.verification_notes,
                    CONCAT(
                        'Asset marked as ',
                        NEW.verification_status,
                        ' during audit.'
                    )
                ),
                NEW.verified_by
            )
            ON CONFLICT (audit_item_id)
            DO UPDATE SET
                discrepancy_type = EXCLUDED.discrepancy_type,
                description = EXCLUDED.description,
                reported_by = EXCLUDED.reported_by,
                reported_at = CURRENT_TIMESTAMP,
                status = 'OPEN',
                resolution = 'NONE',
                updated_at = CURRENT_TIMESTAMP;
        ELSE
            DELETE FROM audit_discrepancies
            WHERE audit_item_id = NEW.id
              AND status = 'OPEN';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_audit_item_verification_trigger
AFTER UPDATE OF verification_status ON audit_items
FOR EACH ROW
EXECUTE FUNCTION handle_audit_item_verification();

-- =====================================================================
-- RECALCULATE AUDIT CYCLE COUNTS
-- =====================================================================

CREATE OR REPLACE FUNCTION recalculate_audit_cycle_counts(
    p_audit_cycle_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE audit_cycles ac
    SET
        total_assets = counts.total_assets,
        verified_assets = counts.verified_assets,
        missing_assets = counts.missing_assets,
        damaged_assets = counts.damaged_assets,
        pending_assets = counts.pending_assets,
        updated_at = CURRENT_TIMESTAMP
    FROM (
        SELECT
            COUNT(*)::INTEGER AS total_assets,

            COUNT(*) FILTER (
                WHERE verification_status = 'VERIFIED'
            )::INTEGER AS verified_assets,

            COUNT(*) FILTER (
                WHERE verification_status = 'MISSING'
            )::INTEGER AS missing_assets,

            COUNT(*) FILTER (
                WHERE verification_status = 'DAMAGED'
            )::INTEGER AS damaged_assets,

            COUNT(*) FILTER (
                WHERE verification_status IN (
                    'PENDING',
                    'NOT_ACCESSIBLE'
                )
            )::INTEGER AS pending_assets

        FROM audit_items
        WHERE audit_cycle_id = p_audit_cycle_id
    ) counts
    WHERE ac.id = p_audit_cycle_id;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_recalculate_audit_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM recalculate_audit_cycle_counts(
        COALESCE(NEW.audit_cycle_id, OLD.audit_cycle_id)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalculate_audit_counts_trigger
AFTER INSERT OR UPDATE OF verification_status OR DELETE
ON audit_items
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_audit_counts();

-- =====================================================================
-- AUDIT CYCLE CLOSURE
-- Marks confirmed missing assets as LOST and damaged assets accordingly.
-- =====================================================================

CREATE OR REPLACE FUNCTION close_audit_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status = 'CLOSED'
    THEN
        IF EXISTS (
            SELECT 1
            FROM audit_items
            WHERE audit_cycle_id = NEW.id
              AND verification_status = 'PENDING'
        ) THEN
            RAISE EXCEPTION
                'Audit cycle cannot be closed while assets are still pending verification.';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM audit_discrepancies
            WHERE audit_cycle_id = NEW.id
              AND status IN ('OPEN', 'UNDER_REVIEW')
        ) THEN
            RAISE EXCEPTION
                'Audit cycle cannot be closed while discrepancies remain unresolved.';
        END IF;

        UPDATE assets a
        SET
            current_status = 'LOST',
            updated_by = NEW.closed_by,
            updated_at = CURRENT_TIMESTAMP
        FROM audit_discrepancies ad
        WHERE ad.audit_cycle_id = NEW.id
          AND ad.asset_id = a.id
          AND ad.resolution = 'MARKED_LOST';

        UPDATE assets a
        SET
            current_condition = 'DAMAGED',
            current_status = 'UNDER_MAINTENANCE',
            updated_by = NEW.closed_by,
            updated_at = CURRENT_TIMESTAMP
        FROM audit_discrepancies ad
        WHERE ad.audit_cycle_id = NEW.id
          AND ad.asset_id = a.id
          AND ad.resolution = 'SENT_TO_MAINTENANCE';

        UPDATE audit_cycles
        SET
            closed_at = COALESCE(NEW.closed_at, CURRENT_TIMESTAMP)
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER close_audit_cycle_trigger
AFTER UPDATE OF status ON audit_cycles
FOR EACH ROW
EXECUTE FUNCTION close_audit_cycle();

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL,

    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'NORMAL',

    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,

    related_entity_type VARCHAR(100),
    related_entity_id BIGINT,

    action_url TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,

    scheduled_for TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT notifications_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT notification_title_not_empty
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT notification_message_not_empty
        CHECK (BTRIM(message) <> ''),

    CONSTRAINT notification_read_check
        CHECK (
            is_read = FALSE
            OR read_at IS NOT NULL
        )
);

CREATE INDEX notifications_user_idx
    ON notifications(user_id, created_at DESC);

CREATE INDEX notifications_unread_idx
    ON notifications(user_id, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX notifications_type_idx
    ON notifications(type);

CREATE INDEX notifications_priority_idx
    ON notifications(priority);

CREATE INDEX notifications_related_entity_idx
    ON notifications(related_entity_type, related_entity_id);

CREATE INDEX notifications_scheduled_idx
    ON notifications(scheduled_for)
    WHERE delivered_at IS NULL;

-- =====================================================================
-- ACTIVITY / AUDIT LOGS
-- =====================================================================

CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,

    actor_user_id BIGINT,

    action activity_action NOT NULL,

    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,

    description TEXT NOT NULL,

    old_values JSONB,
    new_values JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT activity_logs_actor_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT activity_log_metadata_check
        CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX activity_logs_actor_idx
    ON activity_logs(actor_user_id, created_at DESC);

CREATE INDEX activity_logs_entity_idx
    ON activity_logs(entity_type, entity_id);

CREATE INDEX activity_logs_action_idx
    ON activity_logs(action);

CREATE INDEX activity_logs_created_at_idx
    ON activity_logs(created_at DESC);

CREATE INDEX activity_logs_metadata_gin_idx
    ON activity_logs USING GIN(metadata);

-- =====================================================================
-- REPORT EXPORT HISTORY
-- =====================================================================

CREATE TABLE report_exports (
    id BIGSERIAL PRIMARY KEY,

    report_type VARCHAR(100) NOT NULL,

    requested_by BIGINT NOT NULL,

    filters JSONB NOT NULL DEFAULT '{}'::JSONB,

    file_format VARCHAR(20) NOT NULL,
    file_url TEXT,

    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT report_exports_requested_by_fk
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT report_filters_object_check
        CHECK (jsonb_typeof(filters) = 'object'),

    CONSTRAINT report_file_format_check
        CHECK (
            UPPER(file_format) IN (
                'CSV',
                'XLSX',
                'PDF',
                'JSON'
            )
        )
);

CREATE INDEX report_exports_requested_by_idx
    ON report_exports(requested_by, created_at DESC);

CREATE INDEX report_exports_report_type_idx
    ON report_exports(report_type);

-- =====================================================================
-- SECURE ROLE PROMOTION FUNCTION
-- Only an ADMIN can promote/demote users.
-- Application should call this function instead of directly updating role.
-- =====================================================================

CREATE OR REPLACE FUNCTION assign_user_role(
    p_actor_user_id BIGINT,
    p_target_user_id BIGINT,
    p_new_role user_role,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    actor_role user_role;
    previous_user_role user_role;
BEGIN
    SELECT role
    INTO actor_role
    FROM users
    WHERE id = p_actor_user_id
      AND status = 'ACTIVE';

    IF actor_role IS NULL THEN
        RAISE EXCEPTION 'Actor account does not exist or is inactive.';
    END IF;

    IF actor_role <> 'ADMIN' THEN
        RAISE EXCEPTION
            'Only an administrator can assign user roles.';
    END IF;

    SELECT role
    INTO previous_user_role
    FROM users
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF previous_user_role IS NULL THEN
        RAISE EXCEPTION 'Target user does not exist.';
    END IF;

    IF previous_user_role = p_new_role THEN
        RAISE EXCEPTION
            'User already has the requested role.';
    END IF;

    UPDATE users
    SET
        role = p_new_role,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_target_user_id;

    INSERT INTO role_assignment_history (
        user_id,
        previous_role,
        new_role,
        changed_by,
        reason
    )
    VALUES (
        p_target_user_id,
        previous_user_role,
        p_new_role,
        p_actor_user_id,
        p_reason
    );

    INSERT INTO activity_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        description,
        old_values,
        new_values
    )
    VALUES (
        p_actor_user_id,
        'PROMOTE',
        'USER',
        p_target_user_id,
        'User role changed',
        jsonb_build_object('role', previous_user_role),
        jsonb_build_object('role', p_new_role)
    );
END;
$$;

-- =====================================================================
-- FUNCTION TO CREATE AUDIT ITEMS AUTOMATICALLY FROM SCOPE
-- =====================================================================

CREATE OR REPLACE FUNCTION populate_audit_cycle_assets(
    p_audit_cycle_id BIGINT,
    p_actor_user_id BIGINT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    selected_cycle audit_cycles%ROWTYPE;
    inserted_count INTEGER;
BEGIN
    SELECT *
    INTO selected_cycle
    FROM audit_cycles
    WHERE id = p_audit_cycle_id
    FOR UPDATE;

    IF selected_cycle.id IS NULL THEN
        RAISE EXCEPTION 'Audit cycle does not exist.';
    END IF;

    IF selected_cycle.status NOT IN ('DRAFT', 'SCHEDULED') THEN
        RAISE EXCEPTION
            'Assets can only be populated for draft or scheduled audits.';
    END IF;

    INSERT INTO audit_items (
        audit_cycle_id,
        asset_id,
        expected_location_id,
        expected_department_id,
        expected_holder_employee_id,
        expected_condition
    )
    SELECT
        selected_cycle.id,
        a.id,
        a.location_id,
        a.department_id,
        (
            SELECT aa.employee_id
            FROM asset_allocations aa
            WHERE aa.asset_id = a.id
              AND aa.status IN (
                  'ACTIVE',
                  'RETURN_REQUESTED',
                  'TRANSFER_REQUESTED'
              )
            ORDER BY aa.allocated_at DESC
            LIMIT 1
        ),
        a.current_condition
    FROM assets a
    WHERE
        a.current_status NOT IN ('DISPOSED')
        AND (
            selected_cycle.scope_type = 'ORGANIZATION'

            OR (
                selected_cycle.scope_type = 'DEPARTMENT'
                AND a.department_id = selected_cycle.department_id
            )

            OR (
                selected_cycle.scope_type = 'LOCATION'
                AND a.location_id = selected_cycle.location_id
            )

            OR (
                selected_cycle.scope_type = 'CATEGORY'
                AND a.category_id = selected_cycle.category_id
            )
        )
    ON CONFLICT (audit_cycle_id, asset_id)
    DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    PERFORM recalculate_audit_cycle_counts(p_audit_cycle_id);

    INSERT INTO activity_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata
    )
    VALUES (
        p_actor_user_id,
        'CREATE',
        'AUDIT_CYCLE',
        p_audit_cycle_id,
        'Assets populated into audit cycle',
        jsonb_build_object(
            'assets_added',
            inserted_count
        )
    );

    RETURN inserted_count;
END;
$$;

-- =====================================================================
-- FUNCTION TO REFRESH TIME-BASED BOOKING STATUSES
-- Run this periodically through pg_cron or the backend scheduler.
-- =====================================================================

CREATE OR REPLACE FUNCTION refresh_booking_statuses()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE resource_bookings
    SET
        status = 'ONGOING',
        updated_at = CURRENT_TIMESTAMP
    WHERE status = 'UPCOMING'
      AND start_at <= CURRENT_TIMESTAMP
      AND end_at > CURRENT_TIMESTAMP;

    UPDATE resource_bookings
    SET
        status = 'COMPLETED',
        completed_at = COALESCE(completed_at, end_at),
        updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('UPCOMING', 'ONGOING')
      AND end_at <= CURRENT_TIMESTAMP;
END;
$$;

-- =====================================================================
-- DASHBOARD VIEW
-- =====================================================================

CREATE OR REPLACE VIEW dashboard_kpis AS
SELECT
    COUNT(*) FILTER (
        WHERE a.current_status = 'AVAILABLE'
    ) AS assets_available,

    COUNT(*) FILTER (
        WHERE a.current_status = 'ALLOCATED'
    ) AS assets_allocated,

    COUNT(*) FILTER (
        WHERE a.current_status = 'RESERVED'
    ) AS assets_reserved,

    COUNT(*) FILTER (
        WHERE a.current_status = 'UNDER_MAINTENANCE'
    ) AS assets_under_maintenance,

    COUNT(*) FILTER (
        WHERE a.current_status = 'LOST'
    ) AS assets_lost,

    COUNT(*) FILTER (
        WHERE a.current_status = 'RETIRED'
    ) AS assets_retired,

    COUNT(*) FILTER (
        WHERE a.current_status = 'DISPOSED'
    ) AS assets_disposed,

    (
        SELECT COUNT(*)
        FROM maintenance_requests mr
        WHERE mr.status IN (
            'APPROVED',
            'TECHNICIAN_ASSIGNED',
            'IN_PROGRESS'
        )
          AND (
              mr.requested_service_date = CURRENT_DATE
              OR mr.started_at::DATE = CURRENT_DATE
          )
    ) AS maintenance_today,

    (
        SELECT COUNT(*)
        FROM resource_bookings rb
        WHERE rb.status IN ('UPCOMING', 'ONGOING')
          AND rb.start_at <= CURRENT_TIMESTAMP
          AND rb.end_at > CURRENT_TIMESTAMP
    ) AS active_bookings,

    (
        SELECT COUNT(*)
        FROM asset_transfer_requests atr
        WHERE atr.status = 'REQUESTED'
    ) AS pending_transfers,

    (
        SELECT COUNT(*)
        FROM asset_allocations aa
        WHERE aa.status IN (
            'ACTIVE',
            'RETURN_REQUESTED',
            'TRANSFER_REQUESTED'
        )
          AND aa.expected_return_date
              BETWEEN CURRENT_DATE
              AND CURRENT_DATE + INTERVAL '7 days'
    ) AS upcoming_returns,

    (
        SELECT COUNT(*)
        FROM asset_allocations aa
        WHERE aa.status IN (
            'ACTIVE',
            'RETURN_REQUESTED',
            'TRANSFER_REQUESTED'
        )
          AND aa.expected_return_date < CURRENT_DATE
    ) AS overdue_returns

FROM assets a;

-- =====================================================================
-- OVERDUE ALLOCATIONS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW overdue_asset_allocations AS
SELECT
    aa.id AS allocation_id,
    aa.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    aa.holder_type,
    aa.employee_id,
    u.full_name AS employee_name,

    aa.department_id,
    d.name AS department_name,

    aa.allocated_at,
    aa.expected_return_date,

    CURRENT_DATE - aa.expected_return_date AS overdue_days,

    aa.status
FROM asset_allocations aa
JOIN assets a
    ON a.id = aa.asset_id
LEFT JOIN users u
    ON u.id = aa.employee_id
LEFT JOIN departments d
    ON d.id = aa.department_id
WHERE aa.status IN (
    'ACTIVE',
    'RETURN_REQUESTED',
    'TRANSFER_REQUESTED'
)
AND aa.expected_return_date IS NOT NULL
AND aa.expected_return_date < CURRENT_DATE;

-- =====================================================================
-- UPCOMING RETURNS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW upcoming_asset_returns AS
SELECT
    aa.id AS allocation_id,
    aa.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    aa.holder_type,
    aa.employee_id,
    u.full_name AS employee_name,

    aa.department_id,
    d.name AS department_name,

    aa.expected_return_date,
    aa.expected_return_date - CURRENT_DATE AS days_remaining

FROM asset_allocations aa
JOIN assets a
    ON a.id = aa.asset_id
LEFT JOIN users u
    ON u.id = aa.employee_id
LEFT JOIN departments d
    ON d.id = aa.department_id
WHERE aa.status IN (
    'ACTIVE',
    'RETURN_REQUESTED',
    'TRANSFER_REQUESTED'
)
AND aa.expected_return_date
    BETWEEN CURRENT_DATE
    AND CURRENT_DATE + INTERVAL '30 days';

-- =====================================================================
-- CURRENT ASSET HOLDERS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW current_asset_holders AS
SELECT
    a.id AS asset_id,
    a.asset_tag,
    a.name AS asset_name,
    a.current_status,

    aa.id AS allocation_id,
    aa.holder_type,

    aa.employee_id,
    u.full_name AS employee_name,
    u.email AS employee_email,

    aa.department_id,
    d.name AS department_name,

    aa.allocated_at,
    aa.expected_return_date,

    CASE
        WHEN aa.expected_return_date < CURRENT_DATE
            THEN TRUE
        ELSE FALSE
    END AS is_overdue

FROM assets a
JOIN asset_allocations aa
    ON aa.asset_id = a.id
   AND aa.status IN (
       'ACTIVE',
       'RETURN_REQUESTED',
       'TRANSFER_REQUESTED'
   )
LEFT JOIN users u
    ON u.id = aa.employee_id
LEFT JOIN departments d
    ON d.id = aa.department_id;

-- =====================================================================
-- ASSET UTILIZATION VIEW
-- =====================================================================

CREATE OR REPLACE VIEW asset_utilization_report AS
SELECT
    a.id AS asset_id,
    a.asset_tag,
    a.name AS asset_name,

    ac.id AS category_id,
    ac.name AS category_name,

    COUNT(DISTINCT aa.id) AS total_allocations,
    COUNT(DISTINCT rb.id) AS total_bookings,

    COALESCE(
        SUM(
            EXTRACT(
                EPOCH FROM (
                    COALESCE(aa.actual_returned_at, CURRENT_TIMESTAMP)
                    - aa.allocated_at
                )
            ) / 86400
        ),
        0
    )::NUMERIC(15, 2) AS allocated_days,

    COALESCE(
        SUM(
            EXTRACT(
                EPOCH FROM (
                    rb.end_at - rb.start_at
                )
            ) / 3600
        ),
        0
    )::NUMERIC(15, 2) AS booked_hours,

    MAX(aa.allocated_at) AS last_allocated_at,
    MAX(rb.start_at) AS last_booked_at,

    GREATEST(
        MAX(aa.allocated_at),
        MAX(rb.start_at)
    ) AS last_used_at

FROM assets a
JOIN asset_categories ac
    ON ac.id = a.category_id
LEFT JOIN asset_allocations aa
    ON aa.asset_id = a.id
LEFT JOIN resource_bookings rb
    ON rb.asset_id = a.id
   AND rb.status <> 'CANCELLED'
GROUP BY
    a.id,
    a.asset_tag,
    a.name,
    ac.id,
    ac.name;

-- =====================================================================
-- IDLE ASSETS VIEW
-- =====================================================================

CREATE OR REPLACE VIEW idle_assets_report AS
SELECT
    aur.*,

    CURRENT_DATE -
    COALESCE(
        aur.last_used_at::DATE,
        a.acquisition_date,
        a.created_at::DATE
    ) AS idle_days

FROM asset_utilization_report aur
JOIN assets a
    ON a.id = aur.asset_id
WHERE a.current_status = 'AVAILABLE';

-- =====================================================================
-- MAINTENANCE FREQUENCY REPORT
-- =====================================================================

CREATE OR REPLACE VIEW maintenance_frequency_report AS
SELECT
    a.id AS asset_id,
    a.asset_tag,
    a.name AS asset_name,

    ac.id AS category_id,
    ac.name AS category_name,

    COUNT(mr.id) AS total_maintenance_requests,

    COUNT(mr.id) FILTER (
        WHERE mr.status = 'RESOLVED'
    ) AS resolved_requests,

    COUNT(mr.id) FILTER (
        WHERE mr.status IN (
            'PENDING',
            'APPROVED',
            'TECHNICIAN_ASSIGNED',
            'IN_PROGRESS'
        )
    ) AS open_requests,

    COALESCE(
        SUM(mr.maintenance_cost),
        0
    ) AS total_maintenance_cost,

    MAX(mr.resolved_at) AS last_maintenance_date,

    a.next_maintenance_due_date

FROM assets a
JOIN asset_categories ac
    ON ac.id = a.category_id
LEFT JOIN maintenance_requests mr
    ON mr.asset_id = a.id
GROUP BY
    a.id,
    a.asset_tag,
    a.name,
    ac.id,
    ac.name,
    a.next_maintenance_due_date;

-- =====================================================================
-- ASSETS DUE FOR MAINTENANCE VIEW
-- =====================================================================

CREATE OR REPLACE VIEW assets_due_for_maintenance AS
SELECT
    a.id AS asset_id,
    a.asset_tag,
    a.name AS asset_name,
    a.current_status,
    a.current_condition,

    ac.name AS category_name,

    a.next_maintenance_due_date,

    a.next_maintenance_due_date - CURRENT_DATE AS days_until_due,

    CASE
        WHEN a.next_maintenance_due_date < CURRENT_DATE
            THEN 'OVERDUE'
        WHEN a.next_maintenance_due_date <= CURRENT_DATE + 7
            THEN 'DUE_SOON'
        ELSE 'UPCOMING'
    END AS maintenance_due_status

FROM assets a
JOIN asset_categories ac
    ON ac.id = a.category_id
WHERE a.next_maintenance_due_date IS NOT NULL
  AND a.current_status NOT IN (
      'RETIRED',
      'DISPOSED',
      'LOST'
  );

-- =====================================================================
-- ASSETS NEARING RETIREMENT VIEW
-- =====================================================================

CREATE OR REPLACE VIEW assets_nearing_retirement AS
SELECT
    a.id AS asset_id,
    a.asset_tag,
    a.name AS asset_name,

    ac.name AS category_name,

    a.acquisition_date,
    a.expected_retirement_date,

    a.expected_retirement_date - CURRENT_DATE
        AS days_until_retirement,

    a.current_status,
    a.current_condition

FROM assets a
JOIN asset_categories ac
    ON ac.id = a.category_id
WHERE a.expected_retirement_date IS NOT NULL
  AND a.expected_retirement_date
      <= CURRENT_DATE + INTERVAL '180 days'
  AND a.current_status NOT IN (
      'RETIRED',
      'DISPOSED'
  );

-- =====================================================================
-- DEPARTMENT-WISE ALLOCATION SUMMARY
-- =====================================================================

CREATE OR REPLACE VIEW department_allocation_summary AS
SELECT
    d.id AS department_id,
    d.name AS department_name,
    d.code AS department_code,

    COUNT(DISTINCT a.id) AS registered_assets,

    COUNT(DISTINCT aa.id) FILTER (
        WHERE aa.status IN (
            'ACTIVE',
            'RETURN_REQUESTED',
            'TRANSFER_REQUESTED'
        )
    ) AS active_allocations,

    COUNT(DISTINCT aa.id) FILTER (
        WHERE aa.status IN (
            'ACTIVE',
            'RETURN_REQUESTED',
            'TRANSFER_REQUESTED'
        )
          AND aa.expected_return_date < CURRENT_DATE
    ) AS overdue_allocations,

    COUNT(DISTINCT u.id) FILTER (
        WHERE u.status = 'ACTIVE'
    ) AS active_employees

FROM departments d
LEFT JOIN assets a
    ON a.department_id = d.id
LEFT JOIN asset_allocations aa
    ON (
        aa.department_id = d.id
        OR aa.employee_id IN (
            SELECT id
            FROM users
            WHERE department_id = d.id
        )
    )
LEFT JOIN users u
    ON u.department_id = d.id
GROUP BY
    d.id,
    d.name,
    d.code;

-- =====================================================================
-- RESOURCE BOOKING HEATMAP VIEW
-- =====================================================================

CREATE OR REPLACE VIEW resource_booking_heatmap AS
SELECT
    rb.asset_id,
    a.asset_tag,
    a.name AS resource_name,

    EXTRACT(ISODOW FROM rb.start_at)::INTEGER AS day_of_week,
    TO_CHAR(rb.start_at, 'FMDay') AS day_name,

    EXTRACT(HOUR FROM rb.start_at)::INTEGER AS start_hour,

    COUNT(*) AS booking_count,

    SUM(
        EXTRACT(
            EPOCH FROM (rb.end_at - rb.start_at)
        ) / 3600
    )::NUMERIC(15, 2) AS total_booked_hours

FROM resource_bookings rb
JOIN assets a
    ON a.id = rb.asset_id
WHERE rb.status IN (
    'UPCOMING',
    'ONGOING',
    'COMPLETED'
)
GROUP BY
    rb.asset_id,
    a.asset_tag,
    a.name,
    EXTRACT(ISODOW FROM rb.start_at),
    TO_CHAR(rb.start_at, 'FMDay'),
    EXTRACT(HOUR FROM rb.start_at);

-- =====================================================================
-- ASSET COMPLETE HISTORY VIEW
-- =====================================================================

CREATE OR REPLACE VIEW asset_complete_history AS
SELECT
    ash.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    'STATUS_CHANGE'::TEXT AS history_type,

    ash.changed_at AS event_time,
    ash.changed_by AS performed_by,

    jsonb_build_object(
        'previous_status', ash.previous_status,
        'new_status', ash.new_status,
        'previous_condition', ash.previous_condition,
        'new_condition', ash.new_condition,
        'reason', ash.reason
    ) AS event_details

FROM asset_status_history ash
JOIN assets a
    ON a.id = ash.asset_id

UNION ALL

SELECT
    aa.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    'ALLOCATION'::TEXT AS history_type,

    aa.allocated_at AS event_time,
    aa.allocated_by AS performed_by,

    jsonb_build_object(
        'allocation_id', aa.id,
        'holder_type', aa.holder_type,
        'employee_id', aa.employee_id,
        'department_id', aa.department_id,
        'status', aa.status,
        'expected_return_date', aa.expected_return_date,
        'actual_returned_at', aa.actual_returned_at
    ) AS event_details

FROM asset_allocations aa
JOIN assets a
    ON a.id = aa.asset_id

UNION ALL

SELECT
    mr.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    'MAINTENANCE'::TEXT AS history_type,

    mr.raised_at AS event_time,
    mr.raised_by AS performed_by,

    jsonb_build_object(
        'maintenance_request_id', mr.id,
        'request_number', mr.request_number,
        'issue_title', mr.issue_title,
        'priority', mr.priority,
        'status', mr.status,
        'resolved_at', mr.resolved_at
    ) AS event_details

FROM maintenance_requests mr
JOIN assets a
    ON a.id = mr.asset_id

UNION ALL

SELECT
    ai.asset_id,
    a.asset_tag,
    a.name AS asset_name,

    'AUDIT'::TEXT AS history_type,

    COALESCE(ai.verified_at, ai.created_at) AS event_time,
    COALESCE(ai.verified_by, ac.created_by) AS performed_by,

    jsonb_build_object(
        'audit_cycle_id', ai.audit_cycle_id,
        'audit_number', ac.audit_number,
        'verification_status', ai.verification_status,
        'notes', ai.verification_notes
    ) AS event_details

FROM audit_items ai
JOIN audit_cycles ac
    ON ac.id = ai.audit_cycle_id
JOIN assets a
    ON a.id = ai.asset_id;


COMMIT;