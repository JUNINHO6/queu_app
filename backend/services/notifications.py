import os
import asyncio
import logging
import resend
from twilio.rest import Client
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize Resend
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Initialize Twilio
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER')

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


class NotificationService:
    @staticmethod
    async def send_email_notification(
        recipient_email: str,
        queue_name: str,
        ticket_number: int,
        position: int
    ) -> bool:
        """Send email notification when customer's turn is approaching"""
        if not RESEND_API_KEY:
            logger.warning("RESEND_API_KEY not configured. Email notification skipped.")
            return False

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Arial', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%); padding: 40px 20px; text-align: center; }}
                .header h1 {{ color: white; margin: 0; font-size: 32px; }}
                .content {{ padding: 40px 30px; }}
                .ticket-number {{ font-size: 72px; font-weight: 800; color: #4F46E5; text-align: center; margin: 20px 0; }}
                .info {{ background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Votre tour approche !</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px; color: #334155;">Bonjour,</p>
                    <p style="font-size: 16px; color: #475569;">Votre tour dans la file <strong>{queue_name}</strong> arrive bientôt !</p>
                    
                    <div class="ticket-number">{ticket_number}</div>
                    
                    <div class="info">
                        <p style="margin: 0; color: #92400E;"><strong>📊 Il reste {position} personne(s) devant vous</strong></p>
                    </div>
                    
                    <p style="font-size: 16px; color: #475569; margin-top: 30px;">
                        Merci de vous préparer et de vous présenter au comptoir lorsque votre numéro sera appelé.
                    </p>
                </div>
                <div class="footer">
                    <p>Cette notification a été envoyée automatiquement par le système QUEUE</p>
                </div>
            </div>
        </body>
        </html>
        """

        params = {
            "from": SENDER_EMAIL,
            "to": [recipient_email],
            "subject": f"🎯 Votre tour approche - Numéro {ticket_number}",
            "html": html_content
        }

        try:
            email = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent to {recipient_email}, ID: {email.get('id')}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False

    @staticmethod
    async def send_sms_notification(
        phone_number: str,
        queue_name: str,
        ticket_number: int,
        position: int
    ) -> bool:
        """Send SMS notification when customer's turn is approaching"""
        if not twilio_client:
            logger.warning("Twilio not configured. SMS notification skipped.")
            return False

        message_body = f"🎯 QUEUE: Votre tour approche!\n\nFile: {queue_name}\nVotre numéro: {ticket_number}\nPersonnes devant vous: {position}\n\nPréparez-vous à vous présenter!"

        try:
            message = await asyncio.to_thread(
                twilio_client.messages.create,
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            logger.info(f"SMS sent to {phone_number}, SID: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False

    @staticmethod
    async def send_your_turn_notification(
        email: Optional[str],
        phone: Optional[str],
        queue_name: str,
        ticket_number: int
    ) -> dict:
        """Send 'your turn' notification via email and/or SMS"""
        results = {"email": False, "sms": False}

        if email:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Arial', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
                    .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                    .header {{ background: linear-gradient(135deg, #F97316 0%, #FB923C 100%); padding: 40px 20px; text-align: center; }}
                    .header h1 {{ color: white; margin: 0; font-size: 32px; }}
                    .content {{ padding: 40px 30px; text-align: center; }}
                    .ticket-number {{ font-size: 96px; font-weight: 800; color: #F97316; margin: 20px 0; animation: pulse 2s infinite; }}
                    @keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.7; }} }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔥 C'EST VOTRE TOUR !</h1>
                    </div>
                    <div class="content">
                        <p style="font-size: 20px; color: #334155; font-weight: bold;">File: {queue_name}</p>
                        <div class="ticket-number">{ticket_number}</div>
                        <p style="font-size: 18px; color: #F97316; font-weight: bold;">Présentez-vous maintenant au comptoir !</p>
                    </div>
                </div>
            </body>
            </html>
            """

            params = {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": f"🔥 C'EST VOTRE TOUR - Numéro {ticket_number}",
                "html": html_content
            }

            try:
                await asyncio.to_thread(resend.Emails.send, params)
                results["email"] = True
            except:
                pass

        if phone and twilio_client:
            message_body = f"🔥 C'EST VOTRE TOUR!\n\nFile: {queue_name}\nNuméro: {ticket_number}\n\nPrésentez-vous MAINTENANT au comptoir!"
            
            try:
                await asyncio.to_thread(
                    twilio_client.messages.create,
                    body=message_body,
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone
                )
                results["sms"] = True
            except:
                pass

        return results