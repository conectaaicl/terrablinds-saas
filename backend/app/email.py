# Re-exports from app.core.email — backward compatibility shim
from app.core.email import (  # noqa: F401
    send_email,
    send_jefe_welcome,
    send_password_reset,
    send_user_welcome,
    send_password_changed,
)
