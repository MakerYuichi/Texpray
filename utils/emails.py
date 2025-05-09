from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_USER"),
    MAIL_PASSWORD=os.getenv("EMAIL_PASS"),
    MAIL_FROM = os.getenv("EMAIL_USER"),
    MAIL_PORT = 587,
    MAIL_SERVER="smtp.mail.yahoo.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_reset_email(to_email: EmailStr, reset_link: str):
    print(f"Sending email to {to_email} with link: {reset_link}")
    message = MessageSchema(
        subject="Action Required: Secure Your TexpRay Account",
        recipients=[to_email],
        body=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                    background-color: #f8f9fa;
                }}
                .container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                    background: #2c3e50;
                    color: white;
                    padding: 25px;
                    text-align: center;
                }}
                .header h2 {{
                    margin: 0;
                    font-weight: 600;
                    font-size: 22px;
                }}
                .content {{
                    padding: 30px;
                }}
                .cta-button {{
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #3498db;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: 500;
                    margin: 20px 0;
                }}
                .footer {{
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    background-color: #f1f3f5;
                }}
                .highlight-box {{
                    background: #f8f9fa;
                    border-left: 4px solid #3498db;
                    padding: 15px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>TexpRay Account Security</h2>
                </div>
                
                <div class="content">
                    <p>Dear User,</p>
                    
                    <p>We've received a request to reset your TexpRay account password. To ensure your account security, please verify this action:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="cta-button">Reset Password Now</a>
                    </div>
                    
                    <div class="highlight-box">
                        <p><strong>Important:</strong> This link will expire in <span style="color: #e74c3c;">15 minutes</span>. 
                        If you didn't initiate this request, please secure your account immediately.</p>
                    </div>
                    
                    <p>For your security, this link can only be used once. Need help? <a href="https://support.texpray.com" style="color: #3498db;">Contact our support team</a>.</p>
                    
                    <p>Best regards,<br>The TexpRay Security Team</p>
                </div>
                
                <div class="footer">
                    <p>© {datetime.now().year} TexpRay Technologies. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """,
        subtype="html"
    )
    fm = FastMail(conf)
    await fm.send_message(message)