"""
Máquina de estados de órdenes — 13 estados.

Flujo principal:
  cotizado → cotizacion_enviada → confirmado → en_fabricacion → fabricado
           → agendado → en_ruta → en_instalacion → pendiente_firma → cerrado

Estados terminales: cerrado, cancelado, rechazado
Estado especial: problema (puede volver a múltiples estados)

Cada transición define los roles permitidos para ejecutarla.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TransitionRule:
    from_estado: str
    to_estado: str
    allowed_roles: list[str] = field(default_factory=list)
    # Campo requerido en el body (EstadoChange.notas si se requiere)
    requires_notas: bool = False


# Todos los estados válidos del sistema
ESTADOS_VALIDOS: frozenset[str] = frozenset({
    "cotizado",
    "cotizacion_enviada",
    "confirmado",
    "en_fabricacion",
    "fabricado",
    "agendado",
    "en_ruta",
    "en_instalacion",
    "pendiente_firma",
    "cerrado",
    "problema",
    "cancelado",
    "rechazado",
})

# Estados terminales — ninguna transición de salida permitida
ESTADOS_TERMINALES: frozenset[str] = frozenset({
    "cerrado",
    "cancelado",
    "rechazado",
})

# Mapa: estado_actual → {estado_destino: TransitionRule}
# Permite O(1) lookup en el service
TRANSITION_MAP: dict[str, dict[str, TransitionRule]] = {
    "cotizado": {
        "cotizacion_enviada": TransitionRule(
            from_estado="cotizado",
            to_estado="cotizacion_enviada",
            allowed_roles=["vendedor", "coordinador", "jefe", "gerente"],
        ),
        "confirmado": TransitionRule(
            from_estado="cotizado",
            to_estado="confirmado",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "cancelado": TransitionRule(
            from_estado="cotizado",
            to_estado="cancelado",
            allowed_roles=["jefe", "gerente", "coordinador"],
            requires_notas=True,
        ),
    },
    "cotizacion_enviada": {
        "confirmado": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="confirmado",
            allowed_roles=["coordinador", "jefe", "gerente", "vendedor"],
        ),
        "rechazado": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="rechazado",
            allowed_roles=["coordinador", "jefe", "gerente", "vendedor"],
            requires_notas=False,
        ),
        "cancelado": TransitionRule(
            from_estado="cotizacion_enviada",
            to_estado="cancelado",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "rechazado": {},   # terminal
    "confirmado": {
        "en_fabricacion": TransitionRule(
            from_estado="confirmado",
            to_estado="en_fabricacion",
            allowed_roles=["coordinador", "jefe", "gerente", "fabricante"],
        ),
        "cancelado": TransitionRule(
            from_estado="confirmado",
            to_estado="cancelado",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "en_fabricacion": {
        "fabricado": TransitionRule(
            from_estado="en_fabricacion",
            to_estado="fabricado",
            allowed_roles=["fabricante", "coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="en_fabricacion",
            to_estado="problema",
            allowed_roles=["fabricante", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "fabricado": {
        "agendado": TransitionRule(
            from_estado="fabricado",
            to_estado="agendado",
            allowed_roles=["coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="fabricado",
            to_estado="problema",
            allowed_roles=["coordinador", "jefe", "gerente", "fabricante"],
            requires_notas=True,
        ),
    },
    "agendado": {
        "en_ruta": TransitionRule(
            from_estado="agendado",
            to_estado="en_ruta",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="agendado",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
        "cancelado": TransitionRule(
            from_estado="agendado",
            to_estado="cancelado",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "en_ruta": {
        "en_instalacion": TransitionRule(
            from_estado="en_ruta",
            to_estado="en_instalacion",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="en_ruta",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "en_instalacion": {
        "pendiente_firma": TransitionRule(
            from_estado="en_instalacion",
            to_estado="pendiente_firma",
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
        "cerrado": TransitionRule(
            from_estado="pendiente_firma",
            to_estado="cerrado",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
        ),
        "problema": TransitionRule(
            from_estado="pendiente_firma",
            to_estado="problema",
            allowed_roles=["instalador", "coordinador", "jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "problema": {
        "confirmado": TransitionRule(
            from_estado="problema",
            to_estado="confirmado",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "en_fabricacion": TransitionRule(
            from_estado="problema",
            to_estado="en_fabricacion",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "agendado": TransitionRule(
            from_estado="problema",
            to_estado="agendado",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "en_instalacion": TransitionRule(
            from_estado="problema",
            to_estado="en_instalacion",
            allowed_roles=["jefe", "gerente", "coordinador"],
        ),
        "cancelado": TransitionRule(
            from_estado="problema",
            to_estado="cancelado",
            allowed_roles=["jefe", "gerente"],
            requires_notas=True,
        ),
    },
    "cerrado": {},    # terminal
    "cancelado": {},  # terminal
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
