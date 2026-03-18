"""
Servicio de IA con Groq (OpenAI-compatible).
Usado para: post-venta follow-up, sugerencias de productos, análisis de satisfacción.
"""
import httpx
from app.config import get_settings

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"


async def groq_chat(messages: list[dict], model: str = DEFAULT_MODEL, max_tokens: int = 500, temperature: float = 0.7) -> str | None:
    """Llama a Groq y retorna el texto de respuesta. Retorna None si falla."""
    settings = get_settings()
    api_key = getattr(settings, "GROQ_API_KEY", "")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature},
            )
            data = resp.json()
            if "choices" not in data:
                print(f"[Groq] Error response: {data}", flush=True)
                return None
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[Groq] Exception: {e}", flush=True)
        return None


async def generar_mensaje_post_venta(
    cliente_nombre: str,
    empresa_nombre: str,
    tipo: str,
    descripcion_orden: str | None = None,
) -> str | None:
    """Genera un mensaje de seguimiento post-venta personalizado."""
    tipo_labels = {
        "satisfaccion": "satisfacción del cliente",
        "garantia": "solicitud de garantía",
        "servicio": "servicio adicional",
        "mantencion": "mantención preventiva",
        "otro": "consulta general",
    }
    tipo_label = tipo_labels.get(tipo, tipo)

    system = (
        f"Eres el asistente de post-venta de {empresa_nombre}. "
        "Tu tono es profesional, cálido y empático. "
        "Escribes en español chileno formal. "
        "Tus mensajes son concisos (máximo 3 párrafos) y tienen un llamado a la acción claro."
    )
    user = (
        f"Genera un mensaje de seguimiento post-venta para el cliente '{cliente_nombre}'. "
        f"El contexto es: {tipo_label}. "
        + (f"Detalles del pedido: {descripcion_orden}. " if descripcion_orden else "")
        + "El mensaje debe: 1) Agradecer la preferencia, 2) Preguntar cómo le fue con el servicio/producto, "
        "3) Ofrecer asistencia si necesita algo. No uses asteriscos ni markdown, solo texto plano."
    )
    return await groq_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=300,
        temperature=0.65,
    )


async def analizar_satisfaccion(descripcion: str) -> dict:
    """Analiza texto de retroalimentación y extrae sentimiento + puntos clave."""
    prompt = (
        f"Analiza esta retroalimentación de cliente y responde en JSON con: "
        f'sentimiento (positivo/neutro/negativo), puntos_positivos (lista), puntos_negativos (lista), '
        f'resumen (1 frase). Retroalimentación: "{descripcion}"'
    )
    resp = await groq_chat(
        [{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
        max_tokens=200,
    )
    if not resp:
        return {"sentimiento": "neutro", "puntos_positivos": [], "puntos_negativos": [], "resumen": ""}
    import json, re
    try:
        # Extract JSON from response
        match = re.search(r'\{.*\}', resp, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"sentimiento": "neutro", "puntos_positivos": [], "puntos_negativos": [], "resumen": resp[:100]}


async def sugerir_productos(descripcion_cliente: str, catalogo_muestra: list[str]) -> str | None:
    """Sugiere productos del catálogo basado en descripción del cliente."""
    catalogo_str = "\n".join(f"- {p}" for p in catalogo_muestra[:30])
    prompt = (
        f"Un cliente describe lo que necesita: '{descripcion_cliente}'. "
        f"Del siguiente catálogo de productos, sugiere los 3-5 más apropiados y explica brevemente por qué:\n{catalogo_str}\n"
        "Responde en texto plano, sin markdown."
    )
    return await groq_chat(
        [{"role": "user", "content": prompt}],
        model="llama-3.1-8b-instant",
        max_tokens=300,
    )
