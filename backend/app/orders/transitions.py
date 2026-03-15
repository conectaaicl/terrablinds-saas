"""
Máquina de estados de Órdenes de Trabajo — Flujo Completo.

Flujo principal:
  cotizacion → cotizacion_enviada → aceptada → ot_creada → aprobada
             → en_fabricacion → listo_para_instalar → instalacion_programada
             → en_camino → instalando → instalacion_completada → cerrada

Terminales: cerrada, cancelada, rechazada
Especial:   problema (puede retornar desde múltiples estados)
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TransitionRule:
    from_estado: str
    to_estado: str
    allowed_roles: list[str] = field(default_factory=list)
    requires_notas: bool = False
    auto_notify_client: bool = False   # indica si debe notificar al cliente
    description: str = ""             # descripción legible de la transición


# Todos los estados válidos del sistema
ESTADOS_VALIDOS: frozenset[str] = frozenset({
    # Etapa 1 — Ventas
    "cotizacion",
    "cotizacion_enviada",
    "aceptada",
    # Etapa 2 — OT Interna
    "ot_creada",
    "aprobada",
    # Etapa 3 — Fabricación
    "en_fabricacion",
    "listo_para_instalar",
    # Etapa 4 — Coordinación e Instalación
    "instalacion_programada",
    "en_camino",
    "instalando",
    "instalacion_completada",
    # Terminal positivo
    "cerrada",
    # Terminales negativos
    "cancelada",
    "rechazada",
    # Especial
    "problema",
    # Retrocompatibilidad
    "cotizado", "confirmado", "fabricado", "agendado",
    "en_ruta", "en_instalacion", "pendiente_firma",
    "cerrado", "cancelado", "rechazado",
})

ESTADOS_TERMINALES: frozenset[str] = frozenset({
    "cerrada",
    "cancelada",
    "rechazada",
})

# ─── MAPA DE TRANSICIONES ────────────────────────────────────
# estado_actual → {estado_destino: TransitionRule}
TRANSITION_MAP: dict[str, dict[str, TransitionRule]] = {

    # ── ETAPA 1: VENTAS ─────────────────────────────────────
    "cotizacion": {
        "cotizacion_enviada": TransitionRule(
            from_estado="cotizacion",
            to_estado="cotizacion_enviada",
            allowed_roles=["vendedor", "coordinador", "jefe", "gerente"],
            auto_notify_client=True,
            description="Enviar cotización al cliente",
        ),
        "aceptada": TransitionRule(
            from_estado="cotizacion",
            to_estado="aceptada",
            allowed_roles=["coordinador", "jefe", "gerente"],
            description="El cliente acepta la cotización directamente",
        ),
        "cancelada": TransitionRule(
            from_estado="cotizacion",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente", "coordinador", "vendedor"],
            requires_notas=True,
            description="Cancelar cotización",
        ),
    },

    "cotizacion_enviada": {
        "aceptada": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="aceptada",
            allowed_roles=["coordinador", "jefe", "gerente", "vendedor"],
            description="Cliente acepta la cotización → se crea OT",
        ),
        "rechazada": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="rechazada",
            allowed_roles=["coordinador", "jefe", "gerente", "vendedor"],
            description="Cliente rechaza la cotización",
        ),
        "cancelada": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    "aceptada": {
        "ot_creada": TransitionRule(
            from_estado="aceptada",
            to_estado="ot_creada",
            allowed_roles=["coordinador", "jefe", "gerente", "vendedor"],
            description="Crear Orden de Trabajo formal",
        ),
        "cancelada": TransitionRule(
            from_estado="aceptada",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    # ── ETAPA 2: REVISIÓN INTERNA ────────────────────────────
    "ot_creada": {
        "aprobada": TransitionRule(
            from_estado="ot_creada",
            to_estado="aprobada",
            allowed_roles=["jefe", "gerente", "coordinador"],
            description="Jefe / Coordinador aprueba la OT",
        ),
        "aceptada": TransitionRule(
            from_estado="ot_creada",
            to_estado="aceptada",
            allowed_roles=["jefe", "gerente", "coordinador"],
            requires_notas=True,
            description="Devolver a venta para ajustes",
        ),
        "cancelada": TransitionRule(
            from_estado="ot_creada",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    "aprobada": {
        "en_fabricacion": TransitionRule(
            from_estado="aprobada",
            to_estado="en_fabricacion",
            allowed_roles=["coordinador", "jefe", "gerente", "fabricante"],
            description="Enviar a producción",
        ),
        "cancelada": TransitionRule(
            from_estado="aprobada",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    # ── ETAPA 3: FABRICACIÓN ─────────────────────────────────
    "en_fabricacion": {
        "listo_para_instalar": TransitionRule(
            from_estado="en_fabricacion",
            to_estado="listo_para_instalar",
            allowed_roles=["fabricante", "coordinador", "jefe", "gerente"],
            description="Producto terminado — listo para instalar",
        ),
        "problema": TransitionRule(
            from_estado="en_fabricacion",
            to_estado="problema",
            allowed_roles=["fabricante", "coordinador", "jefe", "gerente"],
            requires_notas=True,
            description="Reportar problema de fabricación",
        ),
    },

    "listo_para_instalar": {
        "instalacion_programada": TransitionRule(
            from_estado="listo_para_instalar",
            to_estado="instalacion_programada",
            allowed_roles=["coordinador", "jefe", "gerente"],
            auto_notify_client=True,
            description="Agendar instalación y notificar al cliente",
        ),
        "problema": TransitionRule(
            from_estado="listo_para_instalar",
            to_estado="problema",
            allowed_roles=["coordinador", "jefe", "gerente", "fabricante"],
            requires_notas=True,
        ),
    },

    # ── ETAPA 4: INSTALACIÓN ─────────────────────────────────
    "instalacion_programada": {
        "en_camino": TransitionRule(
            from_estado="instalacion_programada",
            to_estado="en_camino",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            auto_notify_client=True,
            description="Técnico sale a terreno — GPS activo",
        ),
        "problema": TransitionRule(
            from_estado="instalacion_programada",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
        "cancelada": TransitionRule(
            from_estado="instalacion_programada",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    "en_camino": {
        "instalando": TransitionRule(
            from_estado="en_camino",
            to_estado="instalando",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            auto_notify_client=True,
            description="Técnico llegó — iniciando instalación",
        ),
        "problema": TransitionRule(
            from_estado="en_camino",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },

    "instalando": {
        "instalacion_completada": TransitionRule(
            from_estado="instalando",
            to_estado="instalacion_completada",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            description="Instalación terminada — pendiente cierre",
        ),
        "problema": TransitionRule(
            from_estado="instalando",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },

    "instalacion_completada": {
        "cerrada": TransitionRule(
            from_estado="instalacion_completada",
            to_estado="cerrada",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            auto_notify_client=True,
            description="Cerrar OT — trabajo completo",
        ),
        "problema": TransitionRule(
            from_estado="instalacion_completada",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },

    # ── ESTADO PROBLEMA (puede retornar a múltiples estados) ─
    "problema": {
        "ot_creada": TransitionRule(
            from_estado="problema",
            to_estado="ot_creada",
            allowed_roles=["jefe", "gerente", "coordinador"],
            description="Re-evaluar OT",
        ),
        "aprobada": TransitionRule(
            from_estado="problema",
            to_estado="aprobada",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "en_fabricacion": TransitionRule(
            from_estado="problema",
            to_estado="en_fabricacion",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "listo_para_instalar": TransitionRule(
            from_estado="problema",
            to_estado="listo_para_instalar",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "instalacion_programada": TransitionRule(
            from_estado="problema",
            to_estado="instalacion_programada",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "instalando": TransitionRule(
            from_estado="problema",
            to_estado="instalando",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "cancelada": TransitionRule(
            from_estado="problema",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },

    # ── TERMINALES (sin salida) ──────────────────────────────
    "cerrada":   {},
    "cancelada": {},
    "rechazada": {},

    # ── RETROCOMPATIBILIDAD (estados antiguos → nuevos) ──────
    "cotizado": {
        "cotizacion_enviada": TransitionRule(
            from_estado="cotizado",
            to_estado="cotizacion_enviada",
            allowed_roles=["vendedor", "coordinador", "jefe", "gerente"],
            description="Retrocompat: enviar cotización",
        ),
        "aceptada": TransitionRule(
            from_estado="cotizado",
            to_estado="aceptada",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "cancelada": TransitionRule(
            from_estado="cotizado",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente", "coordinador", "vendedor"],
            requires_notas=True,
        ),
    },
    "confirmado": {
        "en_fabricacion": TransitionRule(
            from_estado="confirmado",
            to_estado="en_fabricacion",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "aprobada": TransitionRule(
            from_estado="confirmado",
            to_estado="aprobada",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "cancelada": TransitionRule(
            from_estado="confirmado",
            to_estado="cancelada",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "fabricado": {
        "listo_para_instalar": TransitionRule(
            from_estado="fabricado",
            to_estado="listo_para_instalar",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "instalacion_programada": TransitionRule(
            from_estado="fabricado",
            to_estado="instalacion_programada",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
    },
    "agendado": {
        "en_camino": TransitionRule(
            from_estado="agendado",
            to_estado="en_camino",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
        "instalacion_programada": TransitionRule(
            from_estado="agendado",
            to_estado="instalacion_programada",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
    },
    "en_ruta": {
        "instalando": TransitionRule(
            from_estado="en_ruta",
            to_estado="instalando",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
    },
    "en_instalacion": {
        "instalacion_completada": TransitionRule(
            from_estado="en_instalacion",
            to_estado="instalacion_completada",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="en_instalacion",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "pendiente_firma": {
        "cerrada": TransitionRule(
            from_estado="pendiente_firma",
            to_estado="cerrada",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
    },
    "cerrado": {},
    "cancelado": {},
    "rechazado": {},
}


def get_allowed_transitions(estado_actual: str) -> list[str]:
    """Retorna los estados destino posibles desde el estado actual."""
    return list(TRANSITION_MAP.get(estado_actual, {}).keys())


def validate_transition(
    estado_actual: str,
    estado_nuevo: str,
    role: str,
) -> TransitionRule | None:
    """
    Valida si la transición es permitida para el rol dado.
    Retorna la TransitionRule si es válida, None si no.
    """
    transitions = TRANSITION_MAP.get(estado_actual, {})
    rule = transitions.get(estado_nuevo)
    if rule is None:
        return None
    if role not in rule.allowed_roles:
        return None
    return rule


def get_stage_label(estado: str) -> str:
    """Retorna la etapa del negocio para el estado dado."""
    ventas = {"cotizacion", "cotizacion_enviada", "aceptada"}
    revision = {"ot_creada", "aprobada"}
    fabricacion = {"en_fabricacion", "listo_para_instalar"}
    instalacion = {"instalacion_programada", "en_camino", "instalando", "instalacion_completada"}

    if estado in ventas:
        return "Ventas"
    if estado in revision:
        return "Revisión"
    if estado in fabricacion:
        return "Fabricación"
    if estado in instalacion:
        return "Instalación"
    if estado == "cerrada":
        return "Completada"
    return "Cancelada / Problema"
