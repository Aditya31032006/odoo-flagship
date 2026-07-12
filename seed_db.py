import psycopg2
from psycopg2.extras import execute_values
from faker import Faker
import bcrypt
import random
from datetime import datetime, timedelta

# Configuration
DB_HOST = "localhost"
DB_NAME = "odoo-flagship"
DB_USER = "postgres"
DB_PASS = "aditya"
DB_PORT = "5432"

fake = Faker()

# Data Quantities
NUM_DEPARTMENTS = 10
NUM_USERS = 50
NUM_LOCATIONS = 5
NUM_CATEGORIES = 10
NUM_ASSETS = 200
NUM_ALLOCATIONS = 50
NUM_BOOKINGS = 50
NUM_MAINTENANCE = 30

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

default_password_hash = hash_password("password123")

def connect_db():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        print(f"Failed to connect to DB: {e}")
        exit(1)

def seed_departments(cursor):
    print(f"Seeding {NUM_DEPARTMENTS} Departments...")
    depts = []
    for _ in range(NUM_DEPARTMENTS):
        name = fake.company() + " Dept"
        code = fake.unique.bothify(text='DPT-###')
        depts.append((name, code, "ACTIVE"))
    
    execute_values(
        cursor,
        "INSERT INTO departments (name, code, status) VALUES %s RETURNING id",
        depts
    )
    return [row[0] for row in cursor.fetchall()]

def seed_users(cursor, dept_ids):
    print(f"Seeding {NUM_USERS} Users...")
    users = []
    
    # We need at least one admin to serve as "created_by"
    admin_email = "admin_seed@assetflow.com"
    cursor.execute("""
        INSERT INTO users (full_name, email, password_hash, role, status) 
        VALUES (%s, %s, %s, %s, %s) RETURNING id
    """, ("Super Admin", admin_email, default_password_hash, "ADMIN", "ACTIVE"))
    admin_id = cursor.fetchone()[0]
    
    for _ in range(NUM_USERS - 1):
        full_name = fake.name()
        email = fake.unique.company_email()
        emp_code = fake.unique.bothify(text='EMP-#####')
        dept_id = random.choice(dept_ids)
        role = random.choices(
            ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'], 
            weights=[5, 10, 15, 70]
        )[0]
        
        users.append((
            emp_code, full_name, email, default_password_hash,
            dept_id, role, 'ACTIVE', admin_id
        ))
        
    execute_values(
        cursor,
        """INSERT INTO users (employee_code, full_name, email, password_hash, 
           department_id, role, status, created_by) VALUES %s RETURNING id""",
        users
    )
    all_user_ids = [admin_id] + [row[0] for row in cursor.fetchall()]
    return all_user_ids, admin_id

def seed_locations(cursor, admin_id):
    print(f"Seeding {NUM_LOCATIONS} Locations...")
    locs = []
    for _ in range(NUM_LOCATIONS):
        name = fake.city() + " Office"
        code = fake.unique.bothify(text='LOC-###')
        locs.append((name, code, admin_id))
    
    execute_values(
        cursor,
        "INSERT INTO locations (name, code, created_by) VALUES %s RETURNING id",
        locs
    )
    return [row[0] for row in cursor.fetchall()]

def seed_categories(cursor, admin_id):
    print(f"Seeding {NUM_CATEGORIES} Categories...")
    cats = []
    for _ in range(NUM_CATEGORIES):
        name = fake.unique.word().capitalize() + " Equipment"
        code = fake.unique.bothify(text='CAT-###')
        cats.append((name, code, admin_id))
    
    execute_values(
        cursor,
        "INSERT INTO asset_categories (name, code, created_by) VALUES %s RETURNING id",
        cats
    )
    return [row[0] for row in cursor.fetchall()]

def seed_assets(cursor, admin_id, category_ids, dept_ids, loc_ids):
    print(f"Seeding {NUM_ASSETS} Assets...")
    assets = []
    statuses = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE']
    conditions = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']
    
    for _ in range(NUM_ASSETS):
        tag = fake.unique.bothify(text='AST-#####')
        name = fake.catch_phrase()
        cat_id = random.choice(category_ids)
        dept_id = random.choice(dept_ids)
        loc_id = random.choice(loc_ids)
        status = random.choice(statuses)
        condition = random.choice(conditions)
        
        # Roughly 20% of assets will be shared/bookable
        is_bookable = random.random() < 0.2
        if is_bookable:
            status = 'AVAILABLE'
            
        assets.append((
            tag, name, cat_id, dept_id, loc_id, 
            status, condition, is_bookable, admin_id
        ))
        
    execute_values(
        cursor,
        """INSERT INTO assets (asset_tag, name, category_id, department_id, location_id, 
           current_status, current_condition, is_shared_bookable, created_by) 
           VALUES %s RETURNING id""",
        assets
    )
    return [row[0] for row in cursor.fetchall()]

def seed_allocations(cursor, admin_id, asset_ids, user_ids):
    print(f"Seeding {NUM_ALLOCATIONS} Allocations...")
    cursor.execute("SELECT id FROM assets WHERE current_status = 'AVAILABLE' AND is_shared_bookable = FALSE")
    avail_assets = [row[0] for row in cursor.fetchall()]
    
    allocs = []
    for _ in range(min(NUM_ALLOCATIONS, len(avail_assets))):
        asset_id = avail_assets.pop()
        user_id = random.choice(user_ids)
        
        allocs.append((
            asset_id, 'EMPLOYEE', user_id, admin_id,
            datetime.now() - timedelta(days=random.randint(1, 100)),
            'GOOD', 'ACTIVE'
        ))
        
    if allocs:
        execute_values(
            cursor,
            """INSERT INTO asset_allocations (asset_id, holder_type, employee_id, 
               allocated_by, allocated_at, checkout_condition, status) VALUES %s""",
            allocs
        )
        alloc_asset_ids = [a[0] for a in allocs]
        cursor.execute("UPDATE assets SET current_status = 'ALLOCATED' WHERE id = ANY(%s)", (alloc_asset_ids,))

def seed_bookings(cursor, admin_id, asset_ids, user_ids):
    print(f"Seeding {NUM_BOOKINGS} Bookings...")
    cursor.execute("SELECT id FROM assets WHERE is_shared_bookable = TRUE")
    bookable_assets = [row[0] for row in cursor.fetchall()]
    
    if not bookable_assets:
        return
        
    bookings = []
    for _ in range(NUM_BOOKINGS):
        asset_id = random.choice(bookable_assets)
        user_id = random.choice(user_ids)
        
        is_past = random.random() > 0.3
        if is_past:
            start = datetime.now() - timedelta(days=random.randint(1, 30))
            status = 'COMPLETED'
        else:
            start = datetime.now() + timedelta(days=random.randint(1, 14))
            status = 'UPCOMING'
            
        end = start + timedelta(hours=random.randint(1, 8))
        title = fake.catch_phrase()
        
        bookings.append((
            asset_id, user_id, 'EMPLOYEE', user_id, title, start, end, status
        ))
        
    for booking in bookings:
        try:
            cursor.execute("SAVEPOINT booking_sp")
            cursor.execute(
                """INSERT INTO resource_bookings (asset_id, booked_by, created_for_type, 
                   created_for_employee_id, title, start_at, end_at, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                booking
            )
            cursor.execute("RELEASE SAVEPOINT booking_sp")
        except Exception:
            cursor.execute("ROLLBACK TO SAVEPOINT booking_sp")

def seed_maintenance(cursor, admin_id, asset_ids, user_ids):
    print(f"Seeding {NUM_MAINTENANCE} Maintenance Requests...")
    cursor.execute("SELECT id FROM assets")
    all_assets = [row[0] for row in cursor.fetchall()]
    
    requests = []
    for _ in range(NUM_MAINTENANCE):
        asset_id = random.choice(all_assets)
        user_id = random.choice(user_ids)
        status = random.choice(['PENDING', 'IN_PROGRESS', 'RESOLVED'])
        title = fake.catch_phrase()
        
        tech_id = random.choice(user_ids) if status in ['IN_PROGRESS', 'RESOLVED'] else None
        
        requests.append((
            asset_id, user_id, title, fake.sentence(), status,
            'HIGH' if random.random() > 0.8 else 'MEDIUM', tech_id
        ))
        
    execute_values(
        cursor,
        """INSERT INTO maintenance_requests (asset_id, raised_by, issue_title, issue_description,
           status, priority, assigned_technician_id) VALUES %s""",
        requests
    )

def main():
    print("Starting DB Seed...")
    conn = connect_db()
    cursor = conn.cursor()
    
    try:
        # Clear existing specific tables for a clean run if desired
        cursor.execute("TRUNCATE TABLE resource_bookings, asset_allocations, maintenance_requests, assets, asset_categories, locations, users, departments RESTART IDENTITY CASCADE;")
        
        dept_ids = seed_departments(cursor)
        user_ids, admin_id = seed_users(cursor, dept_ids)
        loc_ids = seed_locations(cursor, admin_id)
        cat_ids = seed_categories(cursor, admin_id)
        asset_ids = seed_assets(cursor, admin_id, cat_ids, dept_ids, loc_ids)
        
        seed_allocations(cursor, admin_id, asset_ids, user_ids)
        seed_bookings(cursor, admin_id, asset_ids, user_ids)
        seed_maintenance(cursor, admin_id, asset_ids, user_ids)
        
        conn.commit()
        print("Database seeded successfully!")
    except Exception as e:
        conn.rollback()
        print(f"Error during seeding: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    main()
