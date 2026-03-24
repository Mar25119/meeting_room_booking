from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

import models
import database

# Создаем таблицы
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Meeting Room Booking API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Схемы данных ---

class UserLogin(BaseModel):
    username: str
    role: str = "employee"

class RoomCreate(BaseModel):
    name: str
    capacity: int
    equipment: str = ""

class BookingCreate(BaseModel):
    room_id: int
    user_name: str
    date: str
    time_start: str
    time_end: str
    purpose: str

class BookingUpdate(BaseModel):
    status: str  # для будущего расширения

# --- Зависимости ---

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Эндпоинты ---

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head><title>BookingRoom API</title></head>
        <body style="font-family: sans-serif; padding: 20px;">
            <h1>✅ Система бронирования переговорных комнат</h1>
            <p>📄 API Документация: <a href="/docs">/docs</a></p>
            <p>🖥️ Frontend: откройте файл frontend/index.html</p>
        </body>
    </html>
    """

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    """Вход в систему"""
    return {"username": user.username, "role": user.role}

# === КОМНАТЫ ===

@app.get("/api/rooms")
def get_rooms(db: Session = Depends(get_db)):
    """Получить все комнаты"""
    rooms = db.query(models.Room).all()
    return rooms

@app.post("/api/rooms")
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    """Создать комнату (только админ)"""
    db_room = models.Room(
        name=room.name,
        capacity=room.capacity,
        equipment=room.equipment
    )
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: int, db: Session = Depends(get_db)):
    """Удалить комнату (только админ)"""
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    
    db.delete(room)
    db.commit()
    return {"message": "Комната удалена"}

# === БРОНИРОВАНИЯ ===

@app.get("/api/bookings")
def get_bookings(db: Session = Depends(get_db)):
    """Получить все бронирования"""
    bookings = db.query(models.Booking).all()
    return bookings

@app.get("/api/bookings/room/{room_id}")
def get_room_bookings(room_id: int, db: Session = Depends(get_db)):
    """Получить бронирования конкретной комнаты"""
    bookings = db.query(models.Booking).filter(
        models.Booking.room_id == room_id
    ).all()
    return bookings

@app.post("/api/bookings")
def create_booking(booking: BookingCreate, db: Session = Depends(get_db)):
    """Забронировать комнату"""
    # Проверка: существует ли комната
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Комната не найдена")
    
    # Проверка пересечений по времени
    existing = db.query(models.Booking).filter(
        models.Booking.room_id == booking.room_id,
        models.Booking.date == booking.date,
        (
            (models.Booking.time_start <= booking.time_start) & 
            (models.Booking.time_end > booking.time_start)
        ) |
        (
            (models.Booking.time_start < booking.time_end) & 
            (models.Booking.time_end >= booking.time_end)
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="Это время уже забронировано!"
        )
    
    db_booking = models.Booking(
        room_id=booking.room_id,
        user_name=booking.user_name,
        date=booking.date,
        time_start=booking.time_start,
        time_end=booking.time_end,
        purpose=booking.purpose
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

@app.delete("/api/bookings/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_db)):
    """Отменить бронирование"""
    booking = db.query(models.Booking).filter(
        models.Booking.id == booking_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    db.delete(booking)
    db.commit()
    return {"message": "Бронирование отменено"}