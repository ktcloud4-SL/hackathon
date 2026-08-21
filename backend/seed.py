"""Seed default demo accounts for Hackathon presentation."""

import asyncio
from sqlalchemy import text
from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import create_database

DEMO_USERS = [
    # Citizen
    {"email": "citizen@onereport.com", "name": "시민 홍길동", "password": "Password123!", "role": "CITIZEN", "agency_code": None},
    # Agencies
    {"email": "police@onereport.com", "name": "경찰청 상황실", "password": "Password123!", "role": "AGENCY", "agency_code": "POLICE"},
    {"email": "fire@onereport.com", "name": "소방청 상황실", "password": "Password123!", "role": "AGENCY", "agency_code": "FIRE"},
    {"email": "kepco@onereport.com", "name": "한국전력 상황실", "password": "Password123!", "role": "AGENCY", "agency_code": "KEPCO"},
    {"email": "road@onereport.com", "name": "도로관리청 상황실", "password": "Password123!", "role": "AGENCY", "agency_code": "ROAD"},
    {"email": "gas@onereport.com", "name": "가스안전공사 상황실", "password": "Password123!", "role": "AGENCY", "agency_code": "GAS"},
    {"email": "localgov@onereport.com", "name": "관할 지자체 담당부서", "password": "Password123!", "role": "AGENCY", "agency_code": "LOCAL_GOV"},
    # Admin
    {"email": "admin@onereport.com", "name": "통합재난관제실", "password": "Password123!", "role": "ADMIN", "agency_code": None},
]

async def seed():
    settings = get_settings()
    engine, session_factory = create_database(settings.database_url)
    
    async with session_factory() as session:
        # Get agency map
        agency_res = await session.execute(text("SELECT id, code FROM agencies"))
        agencies = {row[1]: row[0] for row in agency_res.fetchall()}
        
        for user_data in DEMO_USERS:
            agency_id = agencies.get(user_data["agency_code"]) if user_data["agency_code"] else None
            pw_hash = hash_password(user_data["password"])
            
            # Upsert user
            await session.execute(
                text("""
                    INSERT INTO users (email, name, password_hash, role, agency_id, is_active)
                    VALUES (:email, :name, :password_hash, :role, :agency_id, true)
                    ON CONFLICT (email) DO UPDATE 
                    SET name = EXCLUDED.name,
                        password_hash = EXCLUDED.password_hash,
                        role = EXCLUDED.role,
                        agency_id = EXCLUDED.agency_id
                """),
                {
                    "email": user_data["email"],
                    "name": user_data["name"],
                    "password_hash": pw_hash,
                    "role": user_data["role"],
                    "agency_id": agency_id,
                }
            )
        await session.commit()
        print("Demo users seeded successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
