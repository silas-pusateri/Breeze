from functools import wraps
from asgiref.sync import async_to_sync
from flask import current_app

def async_route(f):
    """
    Decorator to handle async route functions in Flask
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        return async_to_sync(f)(*args, **kwargs)
    return wrapper 