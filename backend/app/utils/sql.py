def escape_like(s: str) -> str:
    """Escape LIKE wildcards in user input (use with escape='\\\\')."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
