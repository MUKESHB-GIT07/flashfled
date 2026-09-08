import os
import json
from typing import Dict, Any, List

STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "store.json")

DEFAULT_STORE = {
    "sms_subscriptions": [],
    "push_registrations": [],
    "saved_locations": ["Kedarnath", "Chamoli", "Rudraprayag"],
    "alerts_history": [],
    "logs": []
}

def load_store() -> Dict[str, Any]:
    if not os.path.exists(STORE_PATH):
        save_store(DEFAULT_STORE)
        return DEFAULT_STORE
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_STORE

def save_store(data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
    with open(STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def add_sms_subscription(sub: Dict[str, Any]) -> None:
    store = load_store()
    # Filter out duplicate phone numbers
    store["sms_subscriptions"] = [s for s in store.get("sms_subscriptions", []) if s.get("phone_number") != sub.get("phone_number")]
    store["sms_subscriptions"].append(sub)
    save_store(store)

def add_push_registration(push: Dict[str, Any]) -> None:
    store = load_store()
    store["push_registrations"] = [p for p in store.get("push_registrations", []) if p.get("device_token") != push.get("device_token")]
    store["push_registrations"].append(push)
    save_store(store)

def log_event(event_type: str, details: Dict[str, Any]) -> None:
    store = load_store()
    logs = store.get("logs", [])
    logs.append({"event_type": event_type, "details": details})
    store["logs"] = logs[-100:] # Keep last 100 logs
    save_store(store)
