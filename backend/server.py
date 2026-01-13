from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import qrcode
import io
import base64
from fastapi.responses import JSONResponse
import json
from services.notifications import NotificationService
from services.export import ExportService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, queue_id: str):
        await websocket.accept()
        if queue_id not in self.active_connections:
            self.active_connections[queue_id] = set()
        self.active_connections[queue_id].add(websocket)

    def disconnect(self, websocket: WebSocket, queue_id: str):
        if queue_id in self.active_connections:
            self.active_connections[queue_id].discard(websocket)
            if not self.active_connections[queue_id]:
                del self.active_connections[queue_id]

    async def broadcast(self, queue_id: str, message: dict):
        if queue_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[queue_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            for conn in disconnected:
                self.disconnect(conn, queue_id)

manager = ConnectionManager()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class EstablishmentRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class EstablishmentLogin(BaseModel):
    email: EmailStr
    password: str

class Establishment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QueueCreate(BaseModel):
    name: str
    notification_threshold: int = 3

class Queue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    establishment_id: str
    name: str
    status: str = "active"
    current_number: int = 0
    last_called_number: int = 0
    total_served: int = 0
    notification_threshold: int = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    queue_id: str
    ticket_number: int
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str = "waiting"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    called_at: Optional[datetime] = None
    served_at: Optional[datetime] = None
    notified: bool = False

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    queue_id: str
    email: EmailStr
    phone: Optional[str] = None
    reserved_time: datetime
    estimated_arrival: datetime
    status: str = "pending"
    ticket_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReservationCreate(BaseModel):
    email: EmailStr
    phone: Optional[str] = None
    reserved_time: datetime

class QueueStats(BaseModel):
    total_tickets: int
    waiting: int
    served: int
    average_wait_time: Optional[float] = None

class QueueStatus(BaseModel):
    status: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        establishment_id = payload.get("sub")
        if establishment_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return establishment_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.getvalue()).decode()

# Auth endpoints
@api_router.post("/auth/register")
async def register(data: EstablishmentRegister):
    existing = await db.establishments.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    establishment = Establishment(
        name=data.name,
        email=data.email
    )
    doc = establishment.model_dump()
    doc["password_hash"] = hash_password(data.password)
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.establishments.insert_one(doc)
    
    token = create_access_token({"sub": establishment.id, "email": establishment.email})
    return {"token": token, "establishment": establishment}

@api_router.post("/auth/login")
async def login(data: EstablishmentLogin):
    establishment_doc = await db.establishments.find_one({"email": data.email}, {"_id": 0})
    if not establishment_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, establishment_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": establishment_doc["id"], "email": establishment_doc["email"]})
    
    establishment = Establishment(
        id=establishment_doc["id"],
        name=establishment_doc["name"],
        email=establishment_doc["email"],
        created_at=datetime.fromisoformat(establishment_doc["created_at"]) if isinstance(establishment_doc["created_at"], str) else establishment_doc["created_at"]
    )
    
    return {"token": token, "establishment": establishment}

@api_router.get("/auth/me", response_model=Establishment)
async def get_me(establishment_id: str = Depends(get_current_user)):
    doc = await db.establishments.find_one({"id": establishment_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Establishment not found")
    
    if isinstance(doc["created_at"], str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    
    return Establishment(**doc)

# Queue endpoints
@api_router.post("/queues", response_model=Queue)
async def create_queue(data: QueueCreate, establishment_id: str = Depends(get_current_user)):
    queue = Queue(
        establishment_id=establishment_id,
        name=data.name,
        notification_threshold=data.notification_threshold
    )
    doc = queue.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.queues.insert_one(doc)
    return queue

@api_router.get("/queues", response_model=List[Queue])
async def get_queues(establishment_id: str = Depends(get_current_user)):
    queues = await db.queues.find({"establishment_id": establishment_id}, {"_id": 0}).to_list(100)
    for q in queues:
        if isinstance(q["created_at"], str):
            q["created_at"] = datetime.fromisoformat(q["created_at"])
    return queues

@api_router.get("/queues/{queue_id}", response_model=Queue)
async def get_queue(queue_id: str):
    doc = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if isinstance(doc["created_at"], str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    
    return Queue(**doc)

@api_router.put("/queues/{queue_id}/status")
async def update_queue_status(queue_id: str, data: QueueStatus, establishment_id: str = Depends(get_current_user)):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.queues.update_one({"id": queue_id}, {"$set": {"status": data.status}})
    
    await manager.broadcast(queue_id, {"type": "queue_status", "status": data.status})
    
    return {"message": "Status updated"}

@api_router.post("/queues/{queue_id}/call-next")
async def call_next(queue_id: str, establishment_id: str = Depends(get_current_user)):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if queue["status"] != "active":
        raise HTTPException(status_code=400, detail="Queue is not active")
    
    # Find next waiting ticket
    next_ticket = await db.tickets.find_one(
        {"queue_id": queue_id, "status": "waiting"},
        {"_id": 0},
        sort=[("ticket_number", 1)]
    )
    
    if not next_ticket:
        raise HTTPException(status_code=404, detail="No waiting tickets")
    
    # Update ticket status
    called_at = datetime.now(timezone.utc)
    await db.tickets.update_one(
        {"id": next_ticket["id"]},
        {"$set": {"status": "called", "called_at": called_at.isoformat()}}
    )
    
    # Mark previous called ticket as served
    if queue["last_called_number"] > 0:
        await db.tickets.update_one(
            {"queue_id": queue_id, "ticket_number": queue["last_called_number"]},
            {"$set": {"status": "served", "served_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    # Update queue
    await db.queues.update_one(
        {"id": queue_id},
        {
            "$set": {"last_called_number": next_ticket["ticket_number"]},
            "$inc": {"total_served": 1 if queue["last_called_number"] > 0 else 0}
        }
    )
    
    # Broadcast update
    await manager.broadcast(queue_id, {
        "type": "ticket_called",
        "ticket_number": next_ticket["ticket_number"],
        "ticket_id": next_ticket["id"]
    })
    
    # Send "your turn" notification to the called ticket
    if next_ticket.get("email") or next_ticket.get("phone"):
        logger.info(f"🔔 Sending 'your turn' notification to ticket #{next_ticket['ticket_number']}")
        try:
            result = await NotificationService.send_your_turn_notification(
                email=next_ticket.get("email"),
                phone=next_ticket.get("phone"),
                queue_name=queue["name"],
                ticket_number=next_ticket["ticket_number"]
            )
            if result.get("email"):
                logger.info(f"✓ Email 'your turn' sent to {next_ticket.get('email')}")
            else:
                logger.warning(f"✗ Email 'your turn' failed or not configured")
            
            if result.get("sms"):
                logger.info(f"✓ SMS 'your turn' sent to {next_ticket.get('phone')}")
            else:
                logger.warning(f"✗ SMS 'your turn' failed or not configured")
        except Exception as e:
            logger.error(f"❌ Failed to send 'your turn' notification: {str(e)}")
    
    # Check and notify upcoming tickets (threshold = 3)
    threshold = queue.get("notification_threshold", 3)
    upcoming_tickets = await db.tickets.find(
        {
            "queue_id": queue_id,
            "status": "waiting",
            "ticket_number": {
                "$gt": next_ticket["ticket_number"],
                "$lte": next_ticket["ticket_number"] + threshold
            },
            "notified": {"$ne": True}
        },
        {"_id": 0}
    ).to_list(threshold)
    
    for upcoming_ticket in upcoming_tickets:
        position = upcoming_ticket["ticket_number"] - next_ticket["ticket_number"]
        logger.info(f"📧 Notifying ticket #{upcoming_ticket['ticket_number']} ({position} people ahead)")
        
        if upcoming_ticket.get("email"):
            try:
                success = await NotificationService.send_email_notification(
                    upcoming_ticket["email"],
                    queue["name"],
                    upcoming_ticket["ticket_number"],
                    position
                )
                if success:
                    logger.info(f"✓ Email sent to {upcoming_ticket['email']}")
                    # Mark as notified
                    await db.tickets.update_one(
                        {"id": upcoming_ticket["id"]},
                        {"$set": {"notified": True}}
                    )
                else:
                    logger.warning(f"✗ Email not sent (no API key configured)")
            except Exception as e:
                logger.error(f"❌ Failed to send email notification: {str(e)}")
        
        if upcoming_ticket.get("phone"):
            try:
                await NotificationService.send_sms_notification(
                    upcoming_ticket["phone"],
                    queue["name"],
                    upcoming_ticket["ticket_number"],
                    position
                )
            except Exception as e:
                logger.error(f"Failed to send SMS notification: {str(e)}")
    
    return {"ticket_number": next_ticket["ticket_number"], "ticket_id": next_ticket["id"]}

@api_router.post("/queues/{queue_id}/reset")
async def reset_queue(queue_id: str, establishment_id: str = Depends(get_current_user)):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Cancel all waiting tickets
    await db.tickets.update_many(
        {"queue_id": queue_id, "status": "waiting"},
        {"$set": {"status": "cancelled"}}
    )
    
    # Reset queue counters
    await db.queues.update_one(
        {"id": queue_id},
        {"$set": {"current_number": 0, "last_called_number": 0, "total_served": 0}}
    )
    
    await manager.broadcast(queue_id, {"type": "queue_reset"})
    
    return {"message": "Queue reset"}

@api_router.get("/queues/{queue_id}/stats", response_model=QueueStats)
async def get_queue_stats(queue_id: str, establishment_id: str = Depends(get_current_user)):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_tickets = await db.tickets.count_documents({"queue_id": queue_id})
    waiting = await db.tickets.count_documents({"queue_id": queue_id, "status": "waiting"})
    served = await db.tickets.count_documents({"queue_id": queue_id, "status": "served"})
    
    # Calculate average wait time
    served_tickets = await db.tickets.find(
        {"queue_id": queue_id, "status": "served", "served_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "served_at": 1}
    ).to_list(1000)
    
    avg_wait = None
    if served_tickets:
        wait_times = []
        for ticket in served_tickets:
            created = datetime.fromisoformat(ticket["created_at"]) if isinstance(ticket["created_at"], str) else ticket["created_at"]
            served_time = datetime.fromisoformat(ticket["served_at"]) if isinstance(ticket["served_at"], str) else ticket["served_at"]
            wait_times.append((served_time - created).total_seconds() / 60)
        avg_wait = sum(wait_times) / len(wait_times) if wait_times else None
    
    return QueueStats(
        total_tickets=total_tickets,
        waiting=waiting,
        served=served,
        average_wait_time=avg_wait
    )

@api_router.get("/queues/{queue_id}/qr-code")
async def get_qr_code(queue_id: str, establishment_id: str = Depends(get_current_user)):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    queue_url = f"{frontend_url}/q/{queue_id}"
    qr_code_base64 = generate_qr_code(queue_url)
    
    return {"qr_code": f"data:image/png;base64,{qr_code_base64}", "url": queue_url}

# Ticket endpoints
@api_router.post("/queues/{queue_id}/tickets", response_model=Ticket)
async def create_ticket(queue_id: str, data: TicketCreate):
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    if queue["status"] != "active":
        raise HTTPException(status_code=400, detail="Queue is not accepting tickets")
    
    # Get next ticket number
    new_number = queue["current_number"] + 1
    
    ticket = Ticket(
        queue_id=queue_id,
        ticket_number=new_number,
        email=data.email,
        phone=data.phone
    )
    doc = ticket.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.tickets.insert_one(doc)
    
    # Update queue current number
    await db.queues.update_one({"id": queue_id}, {"$set": {"current_number": new_number}})
    
    # Broadcast new ticket
    await manager.broadcast(queue_id, {"type": "new_ticket", "ticket_number": new_number})
    
    return ticket

@api_router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    doc = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if isinstance(doc["created_at"], str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    if doc.get("called_at") and isinstance(doc["called_at"], str):
        doc["called_at"] = datetime.fromisoformat(doc["called_at"])
    if doc.get("served_at") and isinstance(doc["served_at"], str):
        doc["served_at"] = datetime.fromisoformat(doc["served_at"])
    
    return Ticket(**doc)

@api_router.get("/tickets/{ticket_id}/position")
async def get_ticket_position(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket["status"] != "waiting":
        return {
            "position": 0,
            "status": ticket["status"],
            "ticket_number": ticket["ticket_number"]
        }
    
    # Count tickets ahead
    queue = await db.queues.find_one({"id": ticket["queue_id"]}, {"_id": 0})
    
    if queue["last_called_number"] >= ticket["ticket_number"]:
        position = 0
    else:
        position = ticket["ticket_number"] - queue["last_called_number"]
    
    return {
        "position": position,
        "status": ticket["status"],
        "ticket_number": ticket["ticket_number"],
        "current_serving": queue["last_called_number"],
        "estimated_wait_time": await calculate_estimated_wait_time(queue["id"], position)
    }

# Helper function for estimated wait time
async def calculate_estimated_wait_time(queue_id: str, position: int) -> Optional[int]:
    """Calculate estimated wait time in minutes based on recent history"""
    if position <= 0:
        return 0
    
    # Get recently served tickets (last 10)
    recent_tickets = await db.tickets.find(
        {
            "queue_id": queue_id,
            "status": "served",
            "served_at": {"$exists": True},
            "called_at": {"$exists": True}
        },
        {"_id": 0, "called_at": 1, "served_at": 1}
    ).sort("served_at", -1).limit(10).to_list(10)
    
    if not recent_tickets or len(recent_tickets) < 3:
        return None
    
    # Calculate average service time
    service_times = []
    for ticket in recent_tickets:
        called = datetime.fromisoformat(ticket["called_at"]) if isinstance(ticket["called_at"], str) else ticket["called_at"]
        served = datetime.fromisoformat(ticket["served_at"]) if isinstance(ticket["served_at"], str) else ticket["served_at"]
        service_times.append((served - called).total_seconds() / 60)
    
    avg_service_time = sum(service_times) / len(service_times)
    estimated_minutes = int(avg_service_time * position)
    
    return estimated_minutes

# Reservation endpoints
@api_router.post("/queues/{queue_id}/reservations")
async def create_reservation(queue_id: str, data: ReservationCreate):
    """Create a time-slot reservation"""
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    # Calculate estimated arrival based on current queue state
    current_waiting = await db.tickets.count_documents({
        "queue_id": queue_id,
        "status": "waiting"
    })
    
    # Estimate 5 minutes per person
    estimated_arrival = data.reserved_time + timedelta(minutes=current_waiting * 5)
    
    reservation = Reservation(
        queue_id=queue_id,
        email=data.email,
        phone=data.phone,
        reserved_time=data.reserved_time,
        estimated_arrival=estimated_arrival
    )
    
    doc = reservation.model_dump()
    doc["reserved_time"] = doc["reserved_time"].isoformat()
    doc["estimated_arrival"] = doc["estimated_arrival"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.reservations.insert_one(doc)
    
    # Send confirmation email
    if data.email:
        try:
            await NotificationService.send_email_notification(
                data.email,
                queue["name"],
                0,  # No ticket number yet
                0
            )
        except:
            pass
    
    return reservation

@api_router.get("/queues/{queue_id}/reservations")
async def get_reservations(queue_id: str, establishment_id: str = Depends(get_current_user)):
    """Get all reservations for a queue"""
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue or queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    reservations = await db.reservations.find(
        {"queue_id": queue_id},
        {"_id": 0}
    ).sort("reserved_time", 1).to_list(100)
    
    for res in reservations:
        if isinstance(res.get("reserved_time"), str):
            res["reserved_time"] = datetime.fromisoformat(res["reserved_time"])
        if isinstance(res.get("estimated_arrival"), str):
            res["estimated_arrival"] = datetime.fromisoformat(res["estimated_arrival"])
        if isinstance(res.get("created_at"), str):
            res["created_at"] = datetime.fromisoformat(res["created_at"])
    
    return reservations

@api_router.post("/reservations/{reservation_id}/activate")
async def activate_reservation(reservation_id: str):
    """Convert a reservation into an active ticket"""
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation["status"] != "pending":
        raise HTTPException(status_code=400, detail="Reservation already activated or cancelled")
    
    # Create ticket
    ticket_data = TicketCreate(
        email=reservation["email"],
        phone=reservation.get("phone")
    )
    ticket = await create_ticket(reservation["queue_id"], ticket_data)
    
    # Update reservation
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": "activated", "ticket_id": ticket.id}}
    )
    
    return {"ticket": ticket, "message": "Reservation activated"}

# Export endpoints
@api_router.get("/queues/{queue_id}/export/csv")
async def export_queue_stats_csv(queue_id: str, establishment_id: str = Depends(get_current_user)):
    """Export queue statistics as CSV"""
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue or queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    # Get stats
    total_tickets = await db.tickets.count_documents({"queue_id": queue_id})
    waiting = await db.tickets.count_documents({"queue_id": queue_id, "status": "waiting"})
    served = await db.tickets.count_documents({"queue_id": queue_id, "status": "served"})
    
    served_tickets = await db.tickets.find(
        {"queue_id": queue_id, "status": "served", "served_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "served_at": 1}
    ).to_list(1000)
    
    avg_wait = None
    if served_tickets:
        wait_times = []
        for ticket in served_tickets:
            created = datetime.fromisoformat(ticket["created_at"]) if isinstance(ticket["created_at"], str) else ticket["created_at"]
            served_time = datetime.fromisoformat(ticket["served_at"]) if isinstance(ticket["served_at"], str) else ticket["served_at"]
            wait_times.append((served_time - created).total_seconds() / 60)
        avg_wait = sum(wait_times) / len(wait_times)
    
    stats = {
        "total_tickets": total_tickets,
        "waiting": waiting,
        "served": served,
        "average_wait_time": avg_wait
    }
    
    csv_content = ExportService.generate_csv(stats, queue["name"])
    
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=queue_stats_{queue_id}.csv"}
    )

@api_router.get("/queues/{queue_id}/export/pdf")
async def export_queue_stats_pdf(queue_id: str, establishment_id: str = Depends(get_current_user)):
    """Export queue statistics as PDF"""
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue or queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    # Get stats
    total_tickets = await db.tickets.count_documents({"queue_id": queue_id})
    waiting = await db.tickets.count_documents({"queue_id": queue_id, "status": "waiting"})
    served = await db.tickets.count_documents({"queue_id": queue_id, "status": "served"})
    
    served_tickets = await db.tickets.find(
        {"queue_id": queue_id, "status": "served", "served_at": {"$exists": True}},
        {"_id": 0, "created_at": 1, "served_at": 1}
    ).to_list(1000)
    
    avg_wait = None
    if served_tickets:
        wait_times = []
        for ticket in served_tickets:
            created = datetime.fromisoformat(ticket["created_at"]) if isinstance(ticket["created_at"], str) else ticket["created_at"]
            served_time = datetime.fromisoformat(ticket["served_at"]) if isinstance(ticket["served_at"], str) else ticket["served_at"]
            wait_times.append((served_time - created).total_seconds() / 60)
        avg_wait = sum(wait_times) / len(wait_times)
    
    stats = {
        "total_tickets": total_tickets,
        "waiting": waiting,
        "served": served,
        "average_wait_time": avg_wait
    }
    
    pdf_content = ExportService.generate_pdf(stats, queue["name"])
    
    return StreamingResponse(
        io.BytesIO(pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=queue_stats_{queue_id}.pdf"}
    )

# History endpoint
@api_router.get("/queues/{queue_id}/history")
async def get_queue_history(queue_id: str, establishment_id: str = Depends(get_current_user), limit: int = 50):
    """Get ticket history for a queue"""
    queue = await db.queues.find_one({"id": queue_id}, {"_id": 0})
    if not queue or queue["establishment_id"] != establishment_id:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    tickets = await db.tickets.find(
        {"queue_id": queue_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for ticket in tickets:
        if isinstance(ticket.get("created_at"), str):
            ticket["created_at"] = datetime.fromisoformat(ticket["created_at"])
        if ticket.get("called_at") and isinstance(ticket["called_at"], str):
            ticket["called_at"] = datetime.fromisoformat(ticket["called_at"])
        if ticket.get("served_at") and isinstance(ticket["served_at"], str):
            ticket["served_at"] = datetime.fromisoformat(ticket["served_at"])
    
    return tickets

# WebSocket endpoint
@app.websocket("/ws/{queue_id}")
async def websocket_endpoint(websocket: WebSocket, queue_id: str):
    await manager.connect(websocket, queue_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle ping/pong or other client messages if needed
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, queue_id)

@api_router.get("/")
async def root():
    return {"message": "QUEUE API"}

# Notification status endpoint
@api_router.get("/notifications/status")
async def get_notification_status():
    """Check if notification services are configured"""
    resend_configured = bool(os.environ.get('RESEND_API_KEY'))
    twilio_configured = bool(
        os.environ.get('TWILIO_ACCOUNT_SID') and 
        os.environ.get('TWILIO_AUTH_TOKEN')
    )
    
    return {
        "email": {
            "configured": resend_configured,
            "provider": "Resend" if resend_configured else None
        },
        "sms": {
            "configured": twilio_configured,
            "provider": "Twilio" if twilio_configured else None
        },
        "status": "fully_configured" if (resend_configured and twilio_configured) else 
                  "partially_configured" if (resend_configured or twilio_configured) else 
                  "not_configured"
    }

# Test notification endpoint
@api_router.post("/notifications/test")
async def test_notification(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    establishment_id: str = Depends(get_current_user)
):
    """Test notification sending"""
    if not email and not phone:
        raise HTTPException(status_code=400, detail="Provide at least email or phone")
    
    results = {
        "email": None,
        "sms": None
    }
    
    if email:
        try:
            success = await NotificationService.send_email_notification(
                email,
                "File de Test",
                99,
                2
            )
            results["email"] = "sent" if success else "not_configured"
        except Exception as e:
            results["email"] = f"error: {str(e)}"
    
    if phone:
        try:
            success = await NotificationService.send_sms_notification(
                phone,
                "File de Test",
                99,
                2
            )
            results["sms"] = "sent" if success else "not_configured"
        except Exception as e:
            results["sms"] = f"error: {str(e)}"
    
    return results

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()