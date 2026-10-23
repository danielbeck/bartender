try:
    from backend.llm_calls.invent_drink import InventDrinkCall
except ImportError:
    from llm_calls.invent_drink import InventDrinkCall


REGISTRY = {InventDrinkCall.name: InventDrinkCall}
