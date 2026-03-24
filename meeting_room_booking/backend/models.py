from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    capacity = Column(Integer)
    equipment = Column(String)  # например: "Проектор, ТВ, Доска"
    
    bookings = relationship("Booking", back_populates="room")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    user_name = Column(String)
    date = Column(String)  # формат: "2026-03-24"
    time_start = Column(String)  # формат: "14:00"
    time_end = Column(String)    # формат: "15:00"
    purpose = Column(String)
    
    room = relationship("Room", back_populates="bookings")