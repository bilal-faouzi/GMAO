from django.http import FileResponse, Http404
from pathlib import Path

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def serve_react(request, path=""):
    """Serve built React SPA files from frontend/dist.

    If the requested path matches a real file, return it.
    Otherwise return index.html so React Router handles the route.
    """
    if path.startswith("api/") or path.startswith("admin/") or path.startswith("media/"):
        raise Http404()

    file_path = FRONTEND_DIR / path
    if file_path.is_file():
        return FileResponse(file_path.open("rb"))

    index_path = FRONTEND_DIR / "index.html"
    if index_path.is_file():
        return FileResponse(index_path.open("rb"))

    raise Http404()
