from firebase_admin import firestore_async

from .services.firebase_auth import get_firebase_app


def get_firestore():
    return firestore_async.client(app=get_firebase_app())
