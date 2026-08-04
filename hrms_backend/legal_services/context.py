# legal_services/context.py

"""
Thread-local audit context.
Middleware writes to it → signals read from it.
Scoped per-request — no leakage.
"""
import threading

_ctx = threading.local()


def set_context(*, litigation_type=None, court_case_id=None, job_id=None, user=None):
    _ctx.litigation_type = litigation_type
    _ctx.court_case_id = court_case_id
    _ctx.job_id = job_id          # ✅ ADD
    _ctx.user = user


def get_context():
    return {
        'litigation_type': getattr(_ctx, 'litigation_type', None),
        'court_case_id':   getattr(_ctx, 'court_case_id', None),
        'job_id':          getattr(_ctx, 'job_id', None),   # ✅ ADD
        'user':            getattr(_ctx, 'user', None),
    }


def clear_context():
    _ctx.litigation_type = None
    _ctx.court_case_id = None
    _ctx.job_id = None            # ✅ ADD
    _ctx.user = None