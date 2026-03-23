"""
Run this once to seed the database with:
  - 1 admin user (vaibhav@example.com / password123)
  - 1 sample CBSE Grade 10 Science paper

Usage (from backend/ folder):
    python seed.py
"""

import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "edurag")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAMPLE_PAPER = {
    "board": "CBSE",
    "grade": "10",
    "subject": "Science",
    "topics": ["Light - Reflection and Refraction", "Electricity", "Human Eye"],
    "total_marks": 40,
    "duration_minutes": 90,
    "difficulty": "medium",
    "include_answer_key": True,
    "sections": [
        {
            "section_name": "Section A",
            "type": "MCQ",
            "instructions": "Choose the correct answer. Each question carries 1 mark.",
            "questions": [
                {
                    "number": 1,
                    "question": "The angle of incidence equals the angle of reflection. This is known as:",
                    "options": ["A. Snell's Law", "B. Law of Reflection", "C. Refraction Law", "D. Huygen's Principle"],
                    "marks": 1,
                    "topic": "Light - Reflection and Refraction",
                    "answer": "B. Law of Reflection",
                },
                {
                    "number": 2,
                    "question": "Which of the following is the SI unit of electric resistance?",
                    "options": ["A. Ampere", "B. Volt", "C. Ohm", "D. Watt"],
                    "marks": 1,
                    "topic": "Electricity",
                    "answer": "C. Ohm",
                },
                {
                    "number": 3,
                    "question": "The power of a concave lens is always:",
                    "options": ["A. Positive", "B. Negative", "C. Zero", "D. Infinite"],
                    "marks": 1,
                    "topic": "Light - Reflection and Refraction",
                    "answer": "B. Negative",
                },
                {
                    "number": 4,
                    "question": "A person suffering from myopia should use which type of lens?",
                    "options": ["A. Convex lens", "B. Concave lens", "C. Bifocal lens", "D. Cylindrical lens"],
                    "marks": 1,
                    "topic": "Human Eye",
                    "answer": "B. Concave lens",
                },
                {
                    "number": 5,
                    "question": "Ohm's Law states that current through a conductor is proportional to:",
                    "options": ["A. Resistance", "B. Power", "C. Potential difference", "D. Charge"],
                    "marks": 1,
                    "topic": "Electricity",
                    "answer": "C. Potential difference",
                },
            ],
        },
        {
            "section_name": "Section B",
            "type": "short_answer",
            "instructions": "Answer in 2-4 sentences. Each question carries 3 marks.",
            "questions": [
                {
                    "number": 1,
                    "question": "Differentiate between concave and convex mirrors with one example each.",
                    "options": None,
                    "marks": 3,
                    "topic": "Light - Reflection and Refraction",
                    "answer": "A concave mirror curves inward and converges light rays (e.g., used in torches and vehicle headlights). A convex mirror curves outward and diverges light rays, giving a wider field of view (e.g., used as rear-view mirrors in vehicles).",
                },
                {
                    "number": 2,
                    "question": "State and explain Ohm's Law with a mathematical expression.",
                    "options": None,
                    "marks": 3,
                    "topic": "Electricity",
                    "answer": "Ohm's Law states that the current (I) flowing through a conductor is directly proportional to the potential difference (V) applied across its ends, provided temperature and other physical conditions remain constant. Mathematically: V = IR, where R is the resistance of the conductor.",
                },
                {
                    "number": 3,
                    "question": "What is the power of accommodation of the human eye? Why does it decrease with age?",
                    "options": None,
                    "marks": 3,
                    "topic": "Human Eye",
                    "answer": "The power of accommodation is the ability of the eye lens to adjust its focal length to see objects at different distances clearly. With age, the ciliary muscles weaken and the lens loses flexibility, reducing its ability to change shape, which decreases the power of accommodation — a condition called presbyopia.",
                },
            ],
        },
        {
            "section_name": "Section C",
            "type": "long_answer",
            "instructions": "Answer in detail. Each question carries 5 marks.",
            "questions": [
                {
                    "number": 1,
                    "question": "Draw a ray diagram showing image formation by a convex lens when the object is placed at 2F. State the nature, size, and position of the image.",
                    "options": None,
                    "marks": 5,
                    "topic": "Light - Reflection and Refraction",
                    "answer": "When the object is placed at 2F of a convex lens: Position of image — at 2F on the other side. Nature — real and inverted. Size — same size as the object (magnification = 1). Ray diagram: Ray 1 parallel to principal axis refracts through F. Ray 2 through optical centre passes undeviated. Ray 3 through F on object side refracts parallel to axis. All three meet at 2F on image side.",
                },
                {
                    "number": 2,
                    "question": "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. Calculate the equivalent resistance and the total current drawn from a 12V battery.",
                    "options": None,
                    "marks": 5,
                    "topic": "Electricity",
                    "answer": "For parallel combination: 1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. So R = 1Ω. Total current I = V/R = 12/1 = 12 A.",
                },
            ],
        },
    ],
    "questions": [
        {"type": "MCQ", "question": "The angle of incidence equals the angle of reflection. This is known as:", "options": ["A. Snell's Law", "B. Law of Reflection", "C. Refraction Law", "D. Huygen's Principle"], "answer": "B. Law of Reflection", "marks": 1, "topic": "Light - Reflection and Refraction", "section": "Section A"},
        {"type": "MCQ", "question": "Which of the following is the SI unit of electric resistance?", "options": ["A. Ampere", "B. Volt", "C. Ohm", "D. Watt"], "answer": "C. Ohm", "marks": 1, "topic": "Electricity", "section": "Section A"},
        {"type": "MCQ", "question": "The power of a concave lens is always:", "options": ["A. Positive", "B. Negative", "C. Zero", "D. Infinite"], "answer": "B. Negative", "marks": 1, "topic": "Light - Reflection and Refraction", "section": "Section A"},
        {"type": "MCQ", "question": "A person suffering from myopia should use which type of lens?", "options": ["A. Convex lens", "B. Concave lens", "C. Bifocal lens", "D. Cylindrical lens"], "answer": "B. Concave lens", "marks": 1, "topic": "Human Eye", "section": "Section A"},
        {"type": "MCQ", "question": "Ohm's Law states that current through a conductor is proportional to:", "options": ["A. Resistance", "B. Power", "C. Potential difference", "D. Charge"], "answer": "C. Potential difference", "marks": 1, "topic": "Electricity", "section": "Section A"},
        {"type": "short_answer", "question": "Differentiate between concave and convex mirrors with one example each.", "options": None, "answer": "A concave mirror curves inward...", "marks": 3, "topic": "Light - Reflection and Refraction", "section": "Section B"},
        {"type": "short_answer", "question": "State and explain Ohm's Law with a mathematical expression.", "options": None, "answer": "Ohm's Law states...", "marks": 3, "topic": "Electricity", "section": "Section B"},
        {"type": "short_answer", "question": "What is the power of accommodation of the human eye?", "options": None, "answer": "The power of accommodation...", "marks": 3, "topic": "Human Eye", "section": "Section B"},
        {"type": "long_answer", "question": "Draw a ray diagram showing image formation by a convex lens when the object is placed at 2F.", "options": None, "answer": "When the object is placed at 2F...", "marks": 5, "topic": "Light - Reflection and Refraction", "section": "Section C"},
        {"type": "long_answer", "question": "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. Calculate the equivalent resistance.", "options": None, "answer": "1/R = 1/2 + 1/3 + 1/6...", "marks": 5, "topic": "Electricity", "section": "Section C"},
    ],
}


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB]

    await db.command("ping")
    print("Connected to MongoDB")

    # ── Users ──────────────────────────────────────────────
    existing_user = await db.users.find_one({"email": "vaibhav@example.com"})
    if existing_user:
        await db.users.delete_one({"email": "vaibhav@example.com"})
        print("Deleted old user (plain-text password)")

    user_doc = {
        "name": "Vaibhav",
        "email": "vaibhav@example.com",
        "password": pwd_context.hash("password123"),
        "role": "admin",
        "created_at": datetime.utcnow().isoformat(),
    }
    user_result = await db.users.insert_one(user_doc)
    user_id = str(user_result.inserted_id)
    print(f"Created admin user: vaibhav@example.com / password123  (id: {user_id})")

    # ── Sample Paper ───────────────────────────────────────
    existing_paper = await db.papers.find_one({"board": "CBSE", "subject": "Science", "grade": "10"})
    if existing_paper:
        print("Sample paper already exists, skipping.")
    else:
        paper_doc = {
            **SAMPLE_PAPER,
            "created_by": user_id,
            "created_by_name": "Vaibhav",
            "created_at": datetime.utcnow(),
        }
        paper_result = await db.papers.insert_one(paper_doc)
        print(f"Created sample paper  (id: {paper_result.inserted_id})")

    client.close()
    print("\nDone! You can now login and retrieve papers.")


if __name__ == "__main__":
    asyncio.run(seed())