import json
from datetime import datetime
from bson import ObjectId
from fastapi.responses import JSONResponse


class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        def json_serializer(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif hasattr(obj, '__dict__'):
                # Handle objects with __dict__ (like Pydantic models)
                return obj.__dict__
            else:
                return repr(obj)
        
        return json.dumps(
            content,
            default=json_serializer,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")
